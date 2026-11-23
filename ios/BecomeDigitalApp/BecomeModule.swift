import Foundation
import React
import UIKit
import AVFoundation

#if canImport(BDIdentityVerification)
import BDIdentityVerification
#endif

@objc(BecomeModule)
final class BecomeModule: NSObject {
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject: RCTPromiseRejectBlock?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }

  @objc(iniciarBecomeSDK:resolver:rejecter:)
  func iniciarBecomeSDK(
    _ params: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.startVerification(params, resolve: resolve, reject: reject)
    }
  }

  private func startVerification(
    _ params: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard pendingResolve == nil, pendingReject == nil else {
      reject("SDK_BUSY", "Ya existe una verificacion en curso.", nil)
      return
    }

    let clientId = (params["clientId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let clientSecret = (params["clientSecret"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let contractId = (params["contractId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let userId = (params["userId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let jwtMode = params["jwt"] != nil || params["verificationResultsJwt"] != nil
    let credentialMode = params["clientId"] != nil || params["clientSecret"] != nil
    guard jwtMode != credentialMode else {
      reject("INVALID_PARAMS", "Use los dos JWT o las credenciales anteriores, sin mezclar los métodos de acceso.", nil)
      return
    }
    let jwt = (params["jwt"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let resultsJwt = (params["verificationResultsJwt"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if let option = params["preventScreenCapture"], !(option is NSNull) {
      guard let number = option as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else {
        reject("INVALID_PARAMS", "preventScreenCapture debe ser booleano.", nil)
        return
      }
    }
    let preventScreenCapture = (params["preventScreenCapture"] as? NSNumber)?.boolValue ?? true

    let authIsValid = jwtMode ? (!jwt.isEmpty && !resultsJwt.isEmpty) : (!clientId.isEmpty && !clientSecret.isEmpty)
    guard authIsValid, !contractId.isEmpty, !userId.isEmpty else {
      reject("INVALID_PARAMS", "Complete los dos JWT o las credenciales anteriores, además de contractId y userId.", nil)
      return
    }
    if jwtMode && [jwt, resultsJwt].contains(where: {
      $0.range(of: "^Bearer(?:\\s|$)", options: [.regularExpression, .caseInsensitive]) != nil
    }) {
      reject("INVALID_PARAMS", "Entregue ambos JWT sin el prefijo Bearer.", nil)
      return
    }

    guard Bundle.main.object(forInfoDictionaryKey: "NSCameraUsageDescription") != nil else {
      reject("MISSING_CAMERA_PERMISSION", "Falta NSCameraUsageDescription en Info.plist.", nil)
      return
    }

    let requiredLicenseFiles = [
      "com.become.blinkid.key.txt",
    ]

    let missingLicenseFiles = requiredLicenseFiles.filter { fileName in
      let nameParts = fileName.split(separator: ".", omittingEmptySubsequences: false)
      guard nameParts.count >= 2 else {
        return true
      }

      let resourceName = nameParts.dropLast().joined(separator: ".")
      let resourceExtension = String(nameParts.last!)
      return Bundle.main.path(forResource: resourceName, ofType: resourceExtension) == nil
    }

    guard missingLicenseFiles.isEmpty else {
      reject(
        "MISSING_LICENSE_FILES",
        "Faltan los archivos de licencia requeridos: \(missingLicenseFiles.joined(separator: ", ")).",
        nil
      )
      return
    }

#if canImport(BDIdentityVerification)
    guard topViewController() != nil else {
      reject(
        "NO_VIEW_CONTROLLER",
        "No fue posible obtener un UIViewController visible para iniciar el SDK.",
        nil
      )
      return
    }

    pendingResolve = resolve
    pendingReject = reject

    var config: BDIVConfig
    if jwtMode {
      config = BDIVConfig(
        jwt: jwt, contractId: contractId,
        documenTypes: [.DNI, .PASSPORT], userId: userId,
        performVerificationCheck: true, flow: .Onboarding,
        preventScreenCapture: preventScreenCapture
      )
      config.verificationResultsJwt = resultsJwt
    } else {
      config = BDIVConfig(
        clienId: clientId, clientSecret: clientSecret, contractId: contractId,
        documenTypes: [.DNI, .PASSPORT], userId: userId,
        performVerificationCheck: true, flow: .Onboarding,
        preventScreenCapture: preventScreenCapture
      )
    }

    let hostController = BecomeSDKHostViewController(
      config: config,
      userId: userId,
      onSuccess: { [weak self] payload in
        self?.pendingResolve?(payload)
        self?.clearPendingState()
      },
      onError: { [weak self] code, message in
        self?.finishWithError(code: code, message: message)
      }
    )

    hostController.modalPresentationStyle = .overFullScreen
    hostController.modalTransitionStyle = .crossDissolve
    let present = {
      guard let currentPresenter = self.topViewController(),
            currentPresenter.viewIfLoaded?.window != nil else {
        self.finishWithError(code: "NO_VIEW_CONTROLLER", message: "Vuelve a la app antes de iniciar la SDK.")
        return
      }
      currentPresenter.present(hostController, animated: false)
    }
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      present()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        DispatchQueue.main.async {
          if granted {
            present()
          } else {
            self.finishWithError(code: "CAMERA_PERMISSION_DENIED", message: "Concede el permiso de cámara en Ajustes.")
          }
        }
      }
    default:
      finishWithError(code: "CAMERA_PERMISSION_DENIED", message: "Concede el permiso de cámara en Ajustes.")
    }
#else
    reject(
      "SDK_NOT_LINKED",
      "El framework BDIdentityVerification.xcframework no esta enlazado al target de iOS.",
      nil
    )
#endif
  }

  private func finishWithError(code: String, message: String) {
    pendingReject?(code, message, nil)
    clearPendingState()
  }

  private func clearPendingState() {
    pendingResolve = nil
    pendingReject = nil
  }

  private func topViewController() -> UIViewController? {
    let activeScenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .filter { $0.activationState == .foregroundActive }

    let keyWindow = activeScenes
      .flatMap(\.windows)
      .first(where: \.isKeyWindow)

    return topViewController(from: keyWindow?.rootViewController)
  }

  private func topViewController(from controller: UIViewController?) -> UIViewController? {
    if let navigationController = controller as? UINavigationController {
      return topViewController(from: navigationController.visibleViewController)
    }

    if let tabBarController = controller as? UITabBarController {
      return topViewController(from: tabBarController.selectedViewController)
    }

    if let presentedController = controller?.presentedViewController {
      return topViewController(from: presentedController)
    }

    return controller
  }
}

#if canImport(BDIdentityVerification)
private final class BecomeSDKHostViewController: UIViewController {
  private let config: BDIVConfig
  private let userId: String
  private let onSuccess: ([String: Any]) -> Void
  private let onError: (String, String) -> Void
  private var hasStarted = false
  private var hasFinished = false
  private var identityVerification: BecomeDigitalSDK?

  init(
    config: BDIVConfig,
    userId: String,
    onSuccess: @escaping ([String: Any]) -> Void,
    onError: @escaping (String, String) -> Void
  ) {
    self.config = config
    self.userId = userId
    self.onSuccess = onSuccess
    self.onError = onError
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) {
    nil
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .clear
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)

    guard !hasStarted else { return }
    hasStarted = true

    identityVerification = BecomeDigitalSDK(bdivConfig: config, delegate: self)
    identityVerification?.startVerification()
  }
}

extension BecomeSDKHostViewController: BDIVDelegate {
  nonisolated func BDIVResponseSuccess(bdivResult: BDIdentityVerificationResponse) {
    let status: String
    switch bdivResult.responseStatus {
    case .SUCCES:
      status = "SUCCES"
    case .ERROR:
      status = "ERROR"
    case .PENDING:
      status = "PENDING"
    case .NOFOUND:
      status = "NOFOUND"
    @unknown default:
      status = "UNKNOWN"
    }
    let message = bdivResult.message
    let responseURL = bdivResult.verification?.urlGetData
    DispatchQueue.main.async { [weak self] in
      self?.handleResponse(status: status, message: message, responseURL: responseURL)
    }
  }

  private func handleResponse(status: String, message: String, responseURL: String?) {
    if status == "ERROR" || status == "NOFOUND" {
      completeWithError(
        code: "SDK_ERROR",
        message: message.isEmpty ? "La verificación finalizó con error." : message
      )
      return
    }

    guard status == "SUCCES" || status == "PENDING" else {
      completeWithError(code: "INVALID_RESPONSE", message: "La SDK devolvió un estado no reconocido.")
      return
    }
    var payload: [String: Any] = [
      "status": status,
      "message": message.isEmpty ? "Verificación completada." : message,
      "userId": userId,
    ]
    // Conserva el campo opcional sin inventar una URL vacía.
    if let url = responseURL, !url.isEmpty {
      payload["responseURL"] = url
    }

    finish {
      self.onSuccess(payload)
    }
  }

  nonisolated func BDIVResponseError(error: String) {
    DispatchQueue.main.async { [weak self] in
      self?.completeWithError(
        code: "SDK_ERROR",
        message: error.isEmpty ? "Ocurrió un error desconocido en la SDK." : error
      )
    }
  }

  private func completeWithError(code: String, message: String) {
    finish {
      self.onError(code, message)
    }
  }

  private func finish(completion: @escaping () -> Void) {
    DispatchQueue.main.async {
      guard !self.hasFinished else { return }
      self.hasFinished = true
      self.identityVerification = nil
      if self.presentingViewController != nil {
        self.dismiss(animated: false, completion: completion)
      } else {
        completion()
      }
    }
  }
}
#endif
