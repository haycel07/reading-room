package chat.tangqichen.onepage;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.Toast;
import android.widget.FrameLayout;
import android.content.ClipboardManager;
import android.content.ClipData;
import android.view.WindowInsetsController;
import android.view.WindowInsetsAnimation;
import android.view.WindowManager;
import java.io.*;
import java.util.*;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONObject;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;

/** Offline reader assets plus explicitly configured HTTPS AI, local speech, and document export. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int PICK_FILE = 41, SAVE_FILE = 42;
    private byte[] pendingExport;
    private TextToSpeech tts;
    private boolean ttsReady;
    private volatile boolean destroyed;
    private final Set<String> canceled = Collections.newSetFromMap(new ConcurrentHashMap<String,Boolean>());
    private final Map<String,HttpsURLConnection> calls = new ConcurrentHashMap<>();
    private WebView web;
    private FrameLayout content;
    private ValueCallback<Uri[]> fileCallback;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        if(Build.VERSION.SDK_INT>=30){
            window.setDecorFitsSystemWindows(false);
            window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        }
        if(Build.VERSION.SDK_INT>=28){WindowManager.LayoutParams lp=window.getAttributes();lp.layoutInDisplayCutoutMode=Build.VERSION.SDK_INT>=30?WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS:WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;window.setAttributes(lp);}
        content=new FrameLayout(this);content.setBackgroundColor(Color.WHITE);
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        content.addView(web,new FrameLayout.LayoutParams(-1,-1));
        // Consume native insets once. A measured parent, rather than WebView padding,
        // gives CSS an accurate usable viewport on both old and new WebViews.
        content.setOnApplyWindowInsetsListener((view,insets)->{applyInsets(insets);return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:insets.consumeSystemWindowInsets();});
        if(Build.VERSION.SDK_INT>=30)content.setWindowInsetsAnimationCallback(new WindowInsetsAnimation.Callback(WindowInsetsAnimation.Callback.DISPATCH_MODE_STOP){@Override public WindowInsets onProgress(WindowInsets insets,List<WindowInsetsAnimation> running){applyInsets(insets);return WindowInsets.CONSUMED;}});
        setContentView(content);setReadingFullscreen(false);content.requestApplyInsets();
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // System document-picker grants only selected files.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(false);
        web.addJavascriptInterface(new FileBridge(), "OnePageFiles");
        web.addJavascriptInterface(new AIBridge(), "OnePageAI");
        web.addJavascriptInterface(new SpeechBridge(), "OnePageSpeech");
        web.addJavascriptInterface(new ReadingBridge(), "OnePageReading");
        tts = new TextToSpeech(this, status -> { ttsReady = status == TextToSpeech.SUCCESS; });
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!ORIGIN.equals(uri.getScheme() + "://" + uri.getHost())) return error(403, "Blocked");
                if (!"GET".equals(request.getMethod())) return error(404, "Not found");
                String path = uri.getPath();
                if (path == null || path.contains("..") || !path.startsWith("/assets/")) return error(404, "Not found");
                path = path.substring(8);
                try {
                    String mime = mime(path);
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-cache");
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, getAssets().open("reader/" + path));
                } catch (IOException exception) { return error(404, "Not found"); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())) return false;
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException exception) { Toast.makeText(MainActivity.this, "未找到浏览器", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivityForResult(intent, PICK_FILE); }
                catch (ActivityNotFoundException exception) {
                    fileCallback.onReceiveValue(null); fileCallback = null;
                    Toast.makeText(MainActivity.this, "系统文件选择器不可用", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        if (saved == null || web.restoreState(saved) == null) web.loadUrl(ORIGIN + "/assets/index.html");
    }
    private void applyInsets(WindowInsets insets){
        if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()),ime=insets.getInsets(WindowInsets.Type.ime());content.setPadding(Math.max(bars.left,ime.left),Math.max(bars.top,ime.top),Math.max(bars.right,ime.right),Math.max(bars.bottom,ime.bottom));}
        else content.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),Math.min(insets.getSystemWindowInsetBottom(),insets.getStableInsetBottom()));
    }
    private void setReadingFullscreen(boolean active){
        if(Build.VERSION.SDK_INT>=30){WindowInsetsController controller=getWindow().getInsetsController();if(controller!=null){controller.setSystemBarsAppearance(WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);if(active)controller.hide(WindowInsets.Type.systemBars());else controller.show(WindowInsets.Type.systemBars());}}
        else{int base=View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;getWindow().getDecorView().setSystemUiVisibility(active?base|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY:base);}
        if(content!=null)content.requestApplyInsets();
    }
    private static WebResourceResponse error(int status, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason, Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private static String mime(String path) {
        String extension = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (extension.equals("js") || extension.equals("mjs")) return "text/javascript";
        if (extension.equals("wasm")) return "application/wasm";
        String known = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        return known == null ? "application/octet-stream" : known;
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == SAVE_FILE) {
            byte[] bytes = pendingExport; pendingExport = null;
            if (result == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                new Thread(() -> { try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
                    if (stream != null) stream.write(bytes);
                    runOnUiThread(() -> Toast.makeText(this,"已保存文件",Toast.LENGTH_SHORT).show());
                } catch (IOException e) { runOnUiThread(() -> Toast.makeText(this,"保存失败，请重试",Toast.LENGTH_LONG).show()); } }).start();
            }
            return;
        }
        if (request == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
    }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(()=>{const open=document.querySelector('dialog[open]');if(open){open.close();return true}const shelf=document.querySelector('.sidebar.open');if(shelf){document.getElementById('closeShelf').click();return true}const panels=['settings','companion','localNotice'];for(const id of panels){const el=document.getElementById(id);if(el&&!el.classList.contains('hidden')){const close=document.getElementById({settings:'closeSettings',companion:'companionClose',localNotice:'localNoticeClose'}[id]);if(close){close.click();return true}}}if(document.fullscreenElement){document.exitFullscreen();return true}if(document.documentElement.classList.contains('native-fullscreen')){OnePageReading.fullscreen(false);document.documentElement.classList.remove('native-fullscreen');return true}const library=document.getElementById('libraryHome');const reading=document.getElementById('reading');if(library&&reading&&!reading.classList.contains('hidden')){library.click();return true}return false})()", handled -> {
            if (!"true".equals(handled)) { if (web.canGoBack()) web.goBack(); else finish(); }
        });
    }
    @Override protected void onDestroy() { destroyed=true;for(HttpsURLConnection c:calls.values())c.disconnect();if(tts!=null){tts.stop();tts.shutdown();}if (fileCallback != null) fileCallback.onReceiveValue(null); web.destroy(); super.onDestroy(); }

    private boolean trustedPage() { return !destroyed && web != null && web.getUrl() != null && web.getUrl().startsWith(ORIGIN + "/assets/"); }
    private final class FileBridge {
        @JavascriptInterface public void save(String name, String mimeType, String base64) {
            if (base64 == null || base64.length() > 112000000) return;
            final byte[] bytes; try { bytes=android.util.Base64.decode(base64,android.util.Base64.DEFAULT); } catch(Exception e){ return; }
            runOnUiThread(() -> {if (!trustedPage() || pendingExport != null) return;pendingExport=bytes;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mimeType != null ? mimeType : "application/octet-stream");
                intent.putExtra(Intent.EXTRA_TITLE,name.replaceAll("[\\/:*?<>|]","_"));
                try{startActivityForResult(intent,SAVE_FILE);}catch(ActivityNotFoundException e){pendingExport=null;Toast.makeText(MainActivity.this,"系统保存窗口不可用",Toast.LENGTH_LONG).show();}
            });
        }
    }
    private final class AIBridge {
        @JavascriptInterface public void request(String id,String input) {
            if (id == null || !id.matches("[a-zA-Z0-9-]{1,80}") || input == null || input.length()>500000) return;
            runOnUiThread(() -> {if(!trustedPage())return;new Thread(() -> {
                if(canceled.remove(id))return;
                JSONObject response;HttpsURLConnection connection=null;
                try {
                    JSONObject req=new JSONObject(input);URL endpoint=new URL(req.getString("endpoint"));
                    if(!"https".equals(endpoint.getProtocol()) || endpoint.getUserInfo()!=null || endpoint.getRef()!=null)throw new IOException();
                    connection=(HttpsURLConnection)endpoint.openConnection();calls.put(id,connection);if(canceled.contains(id))throw new IOException();
                    connection.setConnectTimeout(20000);connection.setReadTimeout(90000);connection.setInstanceFollowRedirects(false);
                    connection.setRequestMethod("POST");connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Authorization","Bearer "+req.getString("sk"));connection.setDoOutput(true);
                    try(OutputStream output=connection.getOutputStream()){output.write(req.getJSONObject("body").toString().getBytes("UTF-8"));}
                    if(connection.getResponseCode()<200 || connection.getResponseCode()>=300){response=new JSONObject();response.put("error","API请求失败（HTTP "+connection.getResponseCode()+"），请检查配置或额度。");}
                    else{ByteArrayOutputStream output=new ByteArrayOutputStream();try(InputStream stream=connection.getInputStream()){byte[] buffer=new byte[8192];int n;while((n=stream.read(buffer))!=-1){output.write(buffer,0,n);if(output.size()>2000000)throw new IOException();}}response=new JSONObject(new String(output.toByteArray(),"UTF-8"));}
                }catch(Exception e){response=new JSONObject();try{response.put("error","无法连接API，请检查HTTPS地址、网络及密钥配置。");}catch(Exception ignored){}}
                finally{calls.remove(id);canceled.remove(id);if(connection!=null)connection.disconnect();}
                final String js="window.__onepageAI&&window.__onepageAI["+JSONObject.quote(id)+"]&&window.__onepageAI["+JSONObject.quote(id)+"]("+response.toString()+")";
                runOnUiThread(() -> {if(trustedPage())web.evaluateJavascript(js,null);});
            }).start();});
        }
        @JavascriptInterface public void cancel(String id) {if(id==null||!id.matches("[a-zA-Z0-9-]{1,80}"))return;canceled.add(id);HttpsURLConnection c=calls.remove(id);if(c!=null)c.disconnect();}
    }
    private final class ReadingBridge {
        @JavascriptInterface public void keepAwake(boolean active) {runOnUiThread(() -> {if(!trustedPage())return;if(active)getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});}
        @JavascriptInterface public void fullscreen(boolean active) {runOnUiThread(() -> {if(trustedPage())setReadingFullscreen(active);});}
        @JavascriptInterface public void readClipboard(String id){
            if(id==null||!id.matches("[a-zA-Z0-9-]{1,80}"))return;
            runOnUiThread(()->{if(!trustedPage()||!web.hasWindowFocus())return;JSONObject result=new JSONObject();try{ClipboardManager manager=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);ClipData clip=manager.getPrimaryClip();CharSequence text=clip!=null&&clip.getItemCount()>0?clip.getItemAt(0).getText():null;if(text==null||text.length()==0)result.put("error","剪贴板里没有文字");else if(text.length()>8192)result.put("error","剪贴板文字过长，请仅复制密钥");else result.put("text",text.toString());}catch(Exception e){try{result.put("error","无法读取剪贴板，请长按输入框粘贴");}catch(Exception ignored){}}
                String callback="window.__onepageClipboard&&window.__onepageClipboard["+JSONObject.quote(id)+"]&&window.__onepageClipboard["+JSONObject.quote(id)+"]("+result.toString()+")";web.evaluateJavascript(callback,null);
            });
        }
    }
    private final class SpeechBridge {
        @JavascriptInterface public void speak(String text,float rate,float pitch) {
            if(text==null || text.length()>12000)return;
            runOnUiThread(() -> {if(!trustedPage() || !ttsReady){Toast.makeText(MainActivity.this,"请先安装本地语音包",Toast.LENGTH_LONG).show();return;}
                Voice selected=null;Set<Voice> voices=tts.getVoices();if(voices!=null)for(Voice v:voices){if(!v.isNetworkConnectionRequired() && v.getLocale().getLanguage().equals("zh")){selected=v;break;}}
                if(selected==null){Toast.makeText(MainActivity.this,"系统没有离线中文音色，请先安装",Toast.LENGTH_LONG).show();return;}
                tts.stop();tts.setVoice(selected);tts.setSpeechRate(Math.max(.5f,Math.min(2f,rate)));tts.setPitch(Math.max(.5f,Math.min(1.5f,pitch)));
                int i=0;while(i<text.length()){int end=Math.min(text.length(),i+3000);if(end<text.length()&&Character.isHighSurrogate(text.charAt(end-1)))end--;tts.speak(text.substring(i,end),i==0?TextToSpeech.QUEUE_FLUSH:TextToSpeech.QUEUE_ADD,null,"onepage-"+i);i=end;}
            });
        }
        @JavascriptInterface public void stop(){runOnUiThread(() -> {if(tts!=null)tts.stop();});}
    }
}
