package com.cueback.translation

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CuebackTranslationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CuebackTranslation")

    Function("isAvailable") {
      true
    }

    AsyncFunction("translateEnglishToKorean") { text: String, promise: Promise ->
      val sourceText = text.trim()
      if (sourceText.isEmpty()) {
        promise.resolve("")
        return@AsyncFunction
      }

      val options = TranslatorOptions.Builder()
        .setSourceLanguage(TranslateLanguage.ENGLISH)
        .setTargetLanguage(TranslateLanguage.KOREAN)
        .build()
      val translator = Translation.getClient(options)
      val downloadConditions = DownloadConditions.Builder().build()

      translator.downloadModelIfNeeded(downloadConditions)
        .addOnSuccessListener {
          translator.translate(sourceText)
            .addOnSuccessListener { translatedText ->
              translator.close()
              promise.resolve(translatedText)
            }
            .addOnFailureListener { error ->
              translator.close()
              promise.reject(
                "translation-failed",
                "On-device English-to-Korean translation failed.",
                error,
              )
            }
        }
        .addOnFailureListener { error ->
          translator.close()
          promise.reject(
            "translation-model-unavailable",
            "The English/Korean translation pack could not be downloaded. Connect once and try again.",
            error,
          )
        }
    }
  }
}
