// Expo config plugin for CarPlay — DEFINITIVE (using scene lifecycle correctly)
// Key insight: AppDelegate creates bridge+rootView in didFinishLaunchingWithOptions.
// When scene lifecycle activates, PhoneSceneDelegate takes the existing window
// and re-parents it to the windowScene. No new bridge/rootView needed.
const { withEntitlementsPlist, withInfoPlist, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCarPlay(config) {
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.carplay-fueling'] = true;
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: true,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneClassName: 'UIWindowScene',
          UISceneConfigurationName: 'Phone',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).PhoneSceneDelegate',
        }],
        CPTemplateApplicationSceneSessionRoleApplication: [{
          UISceneClassName: 'CPTemplateApplicationScene',
          UISceneConfigurationName: 'CarPlay',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate',
        }],
      },
    };
    return mod;
  });

  config = withDangerousMod(config, ['ios', async (mod) => {
    const projectRoot = mod.modRequest.projectRoot;
    const projName = mod.modRequest.projectName || 'MapaTacano';
    const iosDir = path.join(projectRoot, 'ios', projName);

    // PhoneSceneDelegate — re-parents the existing window to the windowScene
    // AppDelegate already created the window+rootView in didFinishLaunchingWithOptions
    // We just need to attach it to the scene's windowScene
    fs.writeFileSync(path.join(iosDir, 'PhoneSceneDelegate.swift'), `import UIKit

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
`);

    // CarPlaySceneDelegate
    fs.writeFileSync(path.join(iosDir, 'CarPlaySceneDelegate.swift'), `import UIKit
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
`);

    // DO NOT modify AppDelegate — let it create window+rootView as normal
    // PhoneSceneDelegate just re-parents the existing window to the scene

    // Add swift files to pbxproj
    const pbxPath = path.join(projectRoot, 'ios', `${projName}.xcodeproj`, 'project.pbxproj');
    if (fs.existsSync(pbxPath)) {
      let pbx = fs.readFileSync(pbxPath, 'utf8');
      const files = [
        { name: 'PhoneSceneDelegate.swift', ref: '9C0000000000000000000010', build: '9C0000000000000000000011' },
        { name: 'CarPlaySceneDelegate.swift', ref: '9C0000000000000000000020', build: '9C0000000000000000000021' },
      ];
      const grp = pbx.match(/([A-F0-9]{24})\s*\/\*\s*AppDelegate\.swift\s*\*\/\s*,/);
      for (const f of files) {
        if (pbx.includes(f.name)) continue;
        pbx = pbx.replace(/\/\* End PBXFileReference section \*\//, `\t\t${f.ref} /* ${f.name} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = ${f.name}; path = ${projName}/${f.name}; sourceTree = "<group>"; };\n/* End PBXFileReference section */`);
        pbx = pbx.replace(/\/\* End PBXBuildFile section \*\//, `\t\t${f.build} /* ${f.name} in Sources */ = {isa = PBXBuildFile; fileRef = ${f.ref} /* ${f.name} */; };\n/* End PBXBuildFile section */`);
        if (grp) pbx = pbx.replace(grp[0], `${grp[0]}\n\t\t\t\t${f.ref} /* ${f.name} */,`);
        const src = pbx.match(/(isa = PBXSourcesBuildPhase[\s\S]*?files = \()([\s\S]*?)(\))/);
        if (src) pbx = pbx.replace(src[0], src[1] + src[2] + `\t\t\t\t${f.build} /* ${f.name} in Sources */,\n` + src[3]);
      }
      fs.writeFileSync(pbxPath, pbx);
    }
    return mod;
  }]);
  return config;
}
module.exports = withCarPlay;
