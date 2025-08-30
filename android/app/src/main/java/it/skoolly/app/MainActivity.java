package it.skoolly.app;

import android.os.Bundle;
import android.content.Intent;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Rendi la WebView trasparente
        getBridge().getWebView().setBackgroundColor(0x00000000);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
        getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);

        // Inizializza Firebase
        FirebaseApp.initializeApp(this);

        // Debug altezza StatusBar e NavigationBar
        int statusBarHeight = getResources().getDimensionPixelSize(
                getResources().getIdentifier("status_bar_height", "dimen", "android")
        );
        int navigationBarHeight = getResources().getDimensionPixelSize(
                getResources().getIdentifier("navigation_bar_height", "dimen", "android")
        );
        Log.d("SAFE_AREA", "StatusBar: " + statusBarHeight + ", NavigationBar: " + navigationBarHeight);

        // Debug usando WindowInsets (più preciso per device moderni)
        getWindow().getDecorView().setOnApplyWindowInsetsListener((v, insets) -> {
            int insetTop = insets.getSystemWindowInsetTop();
            int insetBottom = insets.getSystemWindowInsetBottom();
            int insetLeft = insets.getSystemWindowInsetLeft();
            int insetRight = insets.getSystemWindowInsetRight();
            Log.d("SAFE_AREA_INSETS", "Top: " + insetTop +
                    ", Bottom: " + insetBottom +
                    ", Left: " + insetLeft +
                    ", Right: " + insetRight);
            return insets;
        });

        // Log altezza WebView
        getBridge().getWebView().post(() ->
                Log.d("WEBVIEW_SIZE", "WebView height: " + getBridge().getWebView().getHeight() +
                        ", width: " + getBridge().getWebView().getWidth())
        );
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin login handle is null");
                return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    // Metodo richiesto dal plugin SocialLogin, lasciare vuoto
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}

