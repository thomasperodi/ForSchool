import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import GoogleSignIn
import AuthenticationServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Firebase setup
        FirebaseApp.configure()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Pause ongoing tasks if needed
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Release resources if needed
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Undo background changes if needed
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart tasks if needed
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Save data if needed
    }

    // MARK: - Handle URLs (Google & Apple)
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {

        // 1️⃣ Google Sign-In
        if GIDSignIn.sharedInstance.handle(url) {
            return true
        }

        // 2️⃣ Apple Sign-In
        // Sign in with Apple uses ASAuthorizationAppleIDProvider via delegate, no external module needed
        if let authorizationController = ASAuthorizationAppleIDProvider().createRequest() as? ASAuthorizationController {
            // Normally you handle this in your view controller delegate
        }

        // 3️⃣ Facebook via Capacitor
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // MARK: - Handle Universal Links
    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Push Notifications
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            if let error = error {
                NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
            } else if let token = token {
                NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}
