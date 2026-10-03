import Foundation
import React
import UIKit

#if canImport(BDIdentityVerification)
import BDIdentityVerification
#endif

@objc(BecomeModule)
final class BecomeModule: NSObject {
  private var pendingResolve: RCTPromiseResolveBlock?
  private var pendingReject: RCTPromiseRejectBlock?
  private var pendingUserId: String?

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
    let preventScreenCapture = (params["preventScreenCapture"] as? NSNumber)?.boolValue ?? true

    guard !clientId.isEmpty, !clientSecret.isEmpty, !contractId.isEmpty else {
      reject("INVALID_PARAMS", "clientId, clientSecret y contractId son requeridos.", nil)
      return
    }

    guard Bundle.main.object(forInfoDictionaryKey: "NSCameraUsageDescription") != nil else {
      reject("MISSING_CAMERA_PERMISSION", "Falta NSCameraUsageDescription en Info.plist.", nil)
      return
    }

    let requiredLicenseFiles = [
      "com.become.document.key.txt",
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
    guard let presenter = topViewController() else {
      reject(
        "NO_VIEW_CONTROLLER",
        "No fue posible obtener un UIViewController visible para iniciar el SDK.",
        nil
      )
      return
    }

    pendingResolve = resolve
    pendingReject = reject
    pendingUserId = userId

    let config = BDIVConfig(
      clienId: clientId,
      clientSecret: clientSecret,
      contractId: contractId,
      documenTypes: [.DNI, .DRIVERLICENSE, .PASSPORT],
      userId: userId,
      customerLogo: "icon",
      customLocalizationFileName: "MBLocalizable",
      preventScreenCapture: preventScreenCapture
    )

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
    presenter.present(hostController, animated: false)
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
    pendingUserId = nil
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
  func BDIVResponseSuccess(bdivResult: AnyObject) {
    guard let response = bdivResult as? BDIdentityVerificationResponse else {
      completeWithError(
        code: "INVALID_RESPONSE",
        message: "No fue posible interpretar la respuesta del SDK."
      )
      return
    }

    let status: String
    switch response.responseStatus {
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

    if response.responseStatus == .ERROR || response.responseStatus == .NOFOUND {
      completeWithError(
        code: "SDK_ERROR",
        message: response.message.isEmpty ? "La verificacion finalizo con error." : response.message
      )
      return
    }

    let payload: [String: Any] = [
      "status": status,
      "message": response.message.isEmpty ? "Verificacion completada." : response.message,
      "responseURL": response.responseDictionary?["responseURL"] as? String ?? "",
      "userId": userId,
    ]

    finish {
      self.onSuccess(payload)
    }
  }

  func BDIVResponseError(error: String) {
    completeWithError(
      code: "SDK_ERROR",
      message: error.isEmpty ? "Ocurrio un error desconocido en el SDK." : error
    )
  }

  private func completeWithError(code: String, message: String) {
    finish {
      self.onError(code, message)
    }
  }

  private func finish(completion: @escaping () -> Void) {
    identityVerification = nil

    if presentingViewController != nil {
      dismiss(animated: false, completion: completion)
    } else {
      completion()
    }
  }
}
#endif
