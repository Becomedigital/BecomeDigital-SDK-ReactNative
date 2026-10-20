import XCTest

final class BridgeLaunchTests: XCTestCase {
  func testDemoExposesBridge() {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.buttons["launch-sdk"].waitForExistence(timeout: 45))
    XCTAssertTrue(app.staticTexts["bridge-status"].label.contains("conectado"))
  }

  func testButtonOpensNativeSDKFromPreparedProfile() throws {
    continueAfterFailure = false
    let app = XCUIApplication()
    app.launchArguments = ["-AppleLanguages", "(es)", "-AppleLocale", "es_CO"]
    app.launch()
    let button = app.buttons["launch-sdk"]
    XCTAssertTrue(button.waitForExistence(timeout: 45))
    let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: button)
    let ready = XCTWaiter.wait(for: [enabled], timeout: 10) == .completed
    try XCTSkipIf(!ready, "Guarda un perfil Testing autorizado en el demo antes de probar la SDK.")
    // Use the JS button; never type credentials into XCTest logs.
    button.tap()
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let permission = springboard.alerts.buttons.matching(NSPredicate(
      format: "label IN %@", ["Permitir", "Allow", "OK", "Aceptar"]
    )).firstMatch
    if permission.waitForExistence(timeout: 5) { permission.tap() }
    let introduction = app.staticTexts.matching(NSPredicate(
      format: "label CONTAINS[c] 'Verifiquemos tu identidad' OR label CONTAINS[c] 'verify your identity'"
    )).firstMatch
    XCTAssertTrue(introduction.waitForExistence(timeout: 60), "La SDK no mostró la introducción nativa.")
    // No capture of documents, faces, credentials or personal data.
  }
}
