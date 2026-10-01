package ai.phenawa.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(PhotoGalleryPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
