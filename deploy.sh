#!/bin/bash
# MapaTacaño — Build & Deploy Script
# Usage: ./deploy.sh [build_number]
# Example: ./deploy.sh 90

set -e

BUILD_NUM=${1:-$(python3 -c "import json; print(int(json.load(open('app.json'))['expo']['ios']['buildNumber'])+1)")}
TEAM_ID="6G97KZY6FD"

echo "🚀 MapaTacaño Deploy — Build $BUILD_NUM"
echo "========================================="
echo ""

# 1. Update build number
echo "1️⃣  Updating build number to $BUILD_NUM..."
python3 -c "
import json
with open('app.json') as f: d = json.load(f)
d['expo']['ios']['buildNumber'] = '$BUILD_NUM'
with open('app.json','w') as f: json.dump(d, f, indent=2, ensure_ascii=False)
print('   ✅ app.json updated')
"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUM" ios/MapaTacano/Info.plist
echo "   ✅ Info.plist updated"

# 2. Syntax check
echo ""
echo "2️⃣  Syntax check..."
node -e "
const fs=require('fs');
['App.js','screens/MapScreen.js','screens/DealsScreen.js','screens/AhorroScreen.js','screens/EventsScreen.js','screens/ProfileScreen.js','components/AddDealModal.js','components/AddGasStationModal.js','utils/index.js'].forEach(f=>{
  const c=fs.readFileSync(f,'utf8');let br=0,pa=0,sq=0;
  for(const ch of c){if(ch==='{')br++;if(ch==='}')br--;if(ch==='(')pa++;if(ch===')')pa--;if(ch==='[')sq++;if(ch===']')sq--;}
  if(br||pa||sq){console.log('❌ '+f);process.exit(1);}
});
console.log('   ✅ All files balanced');
"

# 3. Export bundle check
echo ""
echo "3️⃣  Metro bundle check..."
rm -rf /tmp/deploy-check
npx expo export --platform ios --output-dir /tmp/deploy-check 2>&1 | tail -1

# 4. Archive
echo ""
echo "4️⃣  Building archive..."
cd ios
xcodebuild -workspace MapaTacano.xcworkspace -scheme MapaTacano \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath ~/Desktop/MapaTacano-$BUILD_NUM.xcarchive archive \
  DEVELOPMENT_TEAM=$TEAM_ID CODE_SIGN_STYLE=Automatic 2>&1 | grep "ARCHIVE"
cd ..

# 5. Export IPA
echo ""
echo "5️⃣  Exporting IPA..."
cat > /tmp/ExportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>6G97KZY6FD</string>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
EOF

rm -rf ~/Desktop/MapaTacano-IPA-$BUILD_NUM
xcodebuild -exportArchive \
  -archivePath ~/Desktop/MapaTacano-$BUILD_NUM.xcarchive \
  -exportPath ~/Desktop/MapaTacano-IPA-$BUILD_NUM \
  -exportOptionsPlist /tmp/ExportOptions.plist 2>&1 | grep "EXPORT\|Exported"

# 6. Submit to TestFlight
echo ""
echo "6️⃣  Submitting to TestFlight..."
eas submit --platform ios \
  --path ~/Desktop/MapaTacano-IPA-$BUILD_NUM/MapaTacano.ipa \
  --non-interactive 2>&1 | grep -E "✔|Submitted|error"

# 7. Git commit
echo ""
echo "7️⃣  Git commit & push..."
git add -A
git commit -m "v2.0.0 build $BUILD_NUM"
git push origin main

echo ""
echo "🎉 Build $BUILD_NUM deployed to TestFlight!"
echo "   Check: https://appstoreconnect.apple.com/apps/6761061197/testflight/ios"
