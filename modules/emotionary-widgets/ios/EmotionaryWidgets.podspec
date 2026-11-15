Pod::Spec.new do |s|
  s.name           = 'EmotionaryWidgets'
  s.version        = '1.0.0'
  s.summary        = 'Emotionary widget helpers'
  s.description    = 'Reports how many Emotionary widgets are installed.'
  s.license        = 'MIT'
  s.author         = 'Emotionary'
  s.homepage       = 'https://emotionarybook.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,swift}'
end
