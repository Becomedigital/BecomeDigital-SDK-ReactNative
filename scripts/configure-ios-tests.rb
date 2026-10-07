require 'xcodeproj'
root = File.expand_path('..', __dir__)
path = File.join(root, 'ios/BecomeDigitalApp.xcodeproj')
project = Xcodeproj::Project.open(path)
app = project.targets.find { |target| target.name == 'BecomeDigitalApp' }
tests = project.targets.find { |target| target.name == 'BecomeDigitalAppUITests' }
tests ||= project.new_target(:ui_test_bundle, 'BecomeDigitalAppUITests', :ios, '17.0')
tests.add_dependency(app) unless tests.dependencies.any? { |dependency| dependency.target == app }
source = 'BecomeDigitalAppUITests/BridgeLaunchTests.swift'
ref = project.files.find { |file| file.path == source } || project.main_group.new_file(source)
tests.source_build_phase.add_file_reference(ref, true)
# xcodeproj's default Foundation reference embeds its own SDK version. Use the selected SDK.
tests.frameworks_build_phase.files_references.each do |framework|
  next unless framework.path.end_with?('/Foundation.framework')
  framework.path = 'System/Library/Frameworks/Foundation.framework'
  framework.source_tree = 'SDKROOT'
end
tests.build_configurations.each do |config|
  host = app.build_configurations.find { |item| item.name == config.name }.build_settings
  config.build_settings.merge!({
    'PRODUCT_NAME' => '$(TARGET_NAME)',
    'PRODUCT_BUNDLE_IDENTIFIER' => host.fetch('PRODUCT_BUNDLE_IDENTIFIER') + '.uitests',
    'DEVELOPMENT_TEAM' => host['DEVELOPMENT_TEAM'],
    'CODE_SIGN_STYLE' => 'Automatic',
    'CODE_SIGN_IDENTITY' => 'Apple Development',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    # Xcode 27's XCTest runtime requires iOS 17; this does not raise the app minimum.
    'IPHONEOS_DEPLOYMENT_TARGET' => '17.0',
    'SWIFT_VERSION' => '5.0',
    'TEST_TARGET_NAME' => app.name,
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks', '@loader_path/Frameworks']
  })
end
project.root_object.attributes['TargetAttributes'][tests.uuid] = {'TestTargetID' => app.uuid, 'ProvisioningStyle' => 'Automatic'}
project.save
scheme_path = File.join(path, 'xcshareddata/xcschemes/BecomeDigitalApp.xcscheme')
scheme = Xcodeproj::XCScheme.new(scheme_path)
# Replace the stale template test reference; preserve the app launch/build settings.
scheme.test_action.testables = []
scheme.add_test_target(tests)
scheme.test_action.build_configuration = 'Release'
scheme.save_as(path, 'BecomeDigitalApp', true)
puts 'Target de UI registrado; sin credenciales guardadas, la prueba de SDK se omite explícitamente.'
