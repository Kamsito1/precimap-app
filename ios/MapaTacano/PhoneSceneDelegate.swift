import UIKit

class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene,
              let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

        // AppDelegate already created the window with rootView in didFinishLaunchingWithOptions
        // Just re-parent that existing window to this windowScene
        if let existingWindow = appDelegate.window {
            existingWindow.windowScene = windowScene
            self.window = existingWindow
        }
    }
}
