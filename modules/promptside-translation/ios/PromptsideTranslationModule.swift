import ExpoModulesCore
import Foundation
import SwiftUI
import Translation

private final class TranslationPlatformUnavailableException: Exception, @unchecked Sendable {
  override var code: String { "translation-unavailable" }
  override var reason: String { "Apple on-device translation requires iOS or iPadOS 18 or newer." }
}

private final class TranslationViewControllerUnavailableException: Exception, @unchecked Sendable {
  override var code: String { "translation-view-unavailable" }
  override var reason: String { "The translation language-pack prompt could not be presented." }
}

private final class TranslationFailedException: GenericException<String>, @unchecked Sendable {
  override var code: String { "translation-failed" }
  override var reason: String { "Apple on-device translation failed: \(param)" }
}

@available(iOS 18.0, *)
private struct PromptsideTranslationRunner: View {
  let sourceText: String
  let completion: (Result<String, Error>) -> Void

  var body: some View {
    Color.clear
      .frame(width: 1, height: 1)
      .translationTask(
        source: Locale.Language(identifier: "en"),
        target: Locale.Language(identifier: "ko")
      ) { session in
        do {
          let response = try await session.translate(sourceText)
          await MainActor.run { completion(.success(response.targetText)) }
        } catch {
          await MainActor.run { completion(.failure(error)) }
        }
      }
  }
}

public final class PromptsideTranslationModule: Module {
  private var translationHosts: [UUID: UIViewController] = [:]

  public func definition() -> ModuleDefinition {
    Name("PromptsideTranslation")

    Function("isAvailable") {
      if #available(iOS 18.0, *) { return true }
      return false
    }

    AsyncFunction("translateEnglishToKorean") { (text: String, promise: Promise) in
      guard #available(iOS 18.0, *) else {
        promise.reject(TranslationPlatformUnavailableException())
        return
      }

      let sourceText = text.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !sourceText.isEmpty else {
        promise.resolve("")
        return
      }

      guard let parent = self.appContext?.utilities?.currentViewController() else {
        promise.reject(TranslationViewControllerUnavailableException())
        return
      }

      let requestId = UUID()
      let runner = PromptsideTranslationRunner(sourceText: sourceText) { [weak self] result in
        guard let self, let host = self.translationHosts.removeValue(forKey: requestId) else { return }
        host.willMove(toParent: nil)
        host.view.removeFromSuperview()
        host.removeFromParent()

        switch result {
        case .success(let translatedText):
          promise.resolve(translatedText)
        case .failure(let error):
          promise.reject(TranslationFailedException(error.localizedDescription))
        }
      }

      let host = UIHostingController(rootView: runner)
      host.view.backgroundColor = .clear
      host.view.isUserInteractionEnabled = false
      host.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
      parent.addChild(host)
      parent.view.addSubview(host.view)
      host.didMove(toParent: parent)
      self.translationHosts[requestId] = host
    }.runOnQueue(.main)
  }
}
