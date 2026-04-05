import UIKit
import CarPlay

class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        let sel = NSSelectorFromString("connectWithInterfaceController:window:")
        if let cls = NSClassFromString("RNCarPlay") as? NSObject.Type,
           cls.responds(to: sel) {
            _ = cls.perform(sel, with: interfaceController, with: templateApplicationScene.carWindow)
        }
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        let sel = NSSelectorFromString("disconnect")
        if let cls = NSClassFromString("RNCarPlay") as? NSObject.Type,
           cls.responds(to: sel) {
            cls.perform(sel)
        }
    }
}
