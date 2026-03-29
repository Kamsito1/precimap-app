import CarPlay
import UIKit
import CoreLocation

class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
  var interfaceController: CPInterfaceController?
  
  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
  ) {
    self.interfaceController = interfaceController
    showMainMenu()
  }
  
  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didDisconnect interfaceController: CPInterfaceController
  ) {
    self.interfaceController = nil
  }

  // MARK: - Main Menu
  func showMainMenu() {
    let items: [(String, String, String)] = [
      ("⛽", "Gasolineras", "gasolina"),
      ("☕", "Cafeterías", "cafe"),
      ("🍽️", "Restaurantes", "restaurante"),
      ("💊", "Farmacias", "farmacia"),
      ("💪", "Gimnasios", "gimnasio"),
      ("🛒", "Supermercados", "super"),
    ]
    
    let listItems = items.map { (emoji, title, key) -> CPListItem in
      let item = CPListItem(text: "\(emoji) \(title)", detailText: "Buscar el más barato cerca de ti")
      item.handler = { [weak self] _, completion in
        if key == "gasolina" {
          self?.showFuelSelector()
        } else {
          self?.searchNearby(category: key, title: title)
        }
        completion()
      }
      return item
    }
    
    let section = CPListSection(items: listItems)
    let template = CPListTemplate(title: "MapaTacaño", sections: [section])
    template.emptyViewSubtitleVariants = ["Recuerda activar la ubicación"]
    interfaceController?.setRootTemplate(template, animated: true, completion: nil)
  }

  // MARK: - Fuel Type Selector
  func showFuelSelector() {
    let fuels: [(String, String)] = [
      ("Gasolina 95", "g95"),
      ("Diésel A", "diesel"),
      ("Gasolina 98", "g98"),
      ("Diésel Premium", "diesel_plus"),
      ("GLP / Autogas", "glp"),
    ]
    
    let items = fuels.map { (label, key) -> CPListItem in
      let item = CPListItem(text: "⛽ \(label)", detailText: "Buscar la más barata")
      item.handler = { [weak self] _, completion in
        self?.searchNearby(category: "gasolinera", title: label, fuelType: key)
        completion()
      }
      return item
    }
    
    let section = CPListSection(items: items)
    let template = CPListTemplate(title: "Elige carburante", sections: [section])
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
  }

  // MARK: - Search Nearby
  func searchNearby(category: String, title: String, fuelType: String? = nil) {
    // Get user location
    let locationManager = CLLocationManager()
    guard let location = locationManager.location else {
      showError("Activa la ubicación en tu teléfono")
      return
    }
    
    let lat = location.coordinate.latitude
    let lng = location.coordinate.longitude
    
    // Build API URL
    let baseURL = "https://web-production-a8023.up.railway.app"
    var urlString: String
    
    if category == "gasolinera" {
      urlString = "\(baseURL)/api/gasolineras?lat=\(lat)&lng=\(lng)&radius=15"
    } else {
      urlString = "\(baseURL)/api/places?cat=\(category)&lat=\(lat)&lng=\(lng)&radius=15&sort=price_proximity"
    }
    
    guard let url = URL(string: urlString) else { return }
    
    let task = URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
      guard let data = data, error == nil else {
        DispatchQueue.main.async { self?.showError("Sin conexión") }
        return
      }
      
      do {
        if let results = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
          DispatchQueue.main.async {
            self?.showResults(results: results, title: title, category: category, fuelType: fuelType, userLat: lat, userLng: lng)
          }
        }
      } catch {
        DispatchQueue.main.async { self?.showError("Error al cargar datos") }
      }
    }
    task.resume()
    
    // Show loading
    let loadingItem = CPListItem(text: "🔍 Buscando...", detailText: "Cerca de tu ubicación")
    let section = CPListSection(items: [loadingItem])
    let template = CPListTemplate(title: title, sections: [section])
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
  }

  // MARK: - Show Results
  func showResults(results: [[String: Any]], title: String, category: String, fuelType: String?, userLat: Double, userLng: Double) {
    let sorted: [[String: Any]]
    
    if category == "gasolinera", let fuel = fuelType {
      // Sort gas stations by fuel price
      sorted = results
        .filter { station in
          if let prices = station["prices"] as? [String: Any],
             let price = prices[fuel] as? Double, price > 0 { return true }
          return false
        }
        .sorted { a, b in
          let priceA = (a["prices"] as? [String: Any])?[fuel] as? Double ?? 999
          let priceB = (b["prices"] as? [String: Any])?[fuel] as? Double ?? 999
          return priceA < priceB
        }
    } else {
      sorted = Array(results.prefix(10))
    }
    
    let top = Array(sorted.prefix(5))
    
    if top.isEmpty {
      showError("No se encontraron resultados cerca")
      return
    }
    
    let items = top.enumerated().map { (index, result) -> CPListItem in
      let name = result["name"] as? String ?? "Desconocido"
      let lat = result["lat"] as? Double ?? 0
      let lng = result["lng"] as? Double ?? 0
      
      // Calculate distance
      let dLat = (lat - userLat) * .pi / 180
      let dLng = (lng - userLng) * .pi / 180
      let a = sin(dLat/2) * sin(dLat/2) + cos(userLat * .pi/180) * cos(lat * .pi/180) * sin(dLng/2) * sin(dLng/2)
      let dist = 6371 * 2 * atan2(sqrt(a), sqrt(1-a))
      let distLabel = dist < 1 ? "\(Int(dist*1000))m" : String(format: "%.1fkm", dist)
      
      var detail = "📍 \(distLabel)"
      if category == "gasolinera", let fuel = fuelType,
         let prices = result["prices"] as? [String: Any],
         let price = prices[fuel] as? Double {
        detail += " · \(String(format: "%.3f", price))€/L"
        if index == 0 { detail += " 🟢 MÁS BARATA" }
      }
      
      let item = CPListItem(text: "\(index + 1). \(name)", detailText: detail)
      item.handler = { _, completion in
        // Open in Apple Maps for navigation
        let mapsURL = URL(string: "maps://?daddr=\(lat),\(lng)&dirflg=d")!
        UIApplication.shared.open(mapsURL)
        completion()
      }
      return item
    }
    
    let section = CPListSection(items: items)
    let template = CPListTemplate(title: "📍 \(title) cerca", sections: [section])
    
    // Pop loading screen and push results
    interfaceController?.popTemplate(animated: false, completion: nil)
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
  }
  
  // MARK: - Error
  func showError(_ message: String) {
    let item = CPListItem(text: "⚠️ \(message)", detailText: "Vuelve a intentarlo")
    let section = CPListSection(items: [item])
    let template = CPListTemplate(title: "Error", sections: [section])
    
    if interfaceController?.topTemplate != nil {
      interfaceController?.popTemplate(animated: false, completion: nil)
    }
    interfaceController?.pushTemplate(template, animated: true, completion: nil)
  }
}
