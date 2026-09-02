require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'PromptsideTranslation'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'Promptside'
  s.homepage       = 'https://example.invalid/promptside'
  s.platforms      = { :ios => '17.0' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://example.invalid/promptside.git', :tag => s.version.to_s }
  s.static_framework = true
  s.source_files   = 'ios/**/*.swift'
  s.requires_arc   = true

  s.dependency 'ExpoModulesCore'
end
