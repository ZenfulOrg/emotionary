require 'xcodeproj'
root = File.expand_path('../..', __dir__)
project = Xcodeproj::Project.new(File.join(__dir__, 'StoreKitTests.xcodeproj'))
host = project.new_target(:application, 'StoreKitTestHost', :ios, '17.0')
host.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.nowdrops.emotionary.storetesthost'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'TestHost.entitlements'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['CODE_SIGN_IDENTITY'] = '-'
end
host.source_build_phase.add_file_reference(project.main_group.new_file('TestHost.swift'))
target = project.new_target(:unit_test_bundle, 'EmotionaryStoreTests', :ios, '17.0')
target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.nowdrops.emotionary.storetests'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['TEST_HOST'] = '$(BUILT_PRODUCTS_DIR)/StoreKitTestHost.app/StoreKitTestHost'
  config.build_settings['BUNDLE_LOADER'] = '$(TEST_HOST)'
  config.build_settings['CODE_SIGN_IDENTITY'] = '-'
end
['EmotionaryStoreTests.swift', '../../modules/emotionary-purchases/ios/EmotionaryStore.swift'].each do |path|
  target.source_build_phase.add_file_reference(project.main_group.new_file(path))
end
target.resources_build_phase.add_file_reference(project.main_group.new_file('Emotionary.storekit'))
target.add_dependency(host)
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(host)
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.set_launch_target(host)
scheme.save_as(project.path, 'EmotionaryStoreTests', true)
scheme_path = File.join(project.path, 'xcshareddata/xcschemes/EmotionaryStoreTests.xcscheme')
doc = REXML::Document.new(File.read(scheme_path))
ref = doc.elements['Scheme/LaunchAction'].add_element('StoreKitConfigurationFileReference')
ref.add_attribute('identifier', '../Emotionary.storekit')
File.write(scheme_path, doc.to_s)
