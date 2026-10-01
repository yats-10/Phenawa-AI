package ai.phenawa.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "PhotoGallery",
    permissions = @Permission(alias = "legacyWrite", strings = Manifest.permission.WRITE_EXTERNAL_STORAGE)
)
public class PhotoGalleryPlugin extends Plugin {
    @PluginMethod
    public void savePhoto(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
            getPermissionState("legacyWrite") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyWrite", call, "savePhotoPermissionCallback");
            return;
        }
        save(call);
    }

    @PermissionCallback
    private void savePhotoPermissionCallback(PluginCall call) {
        if (getPermissionState("legacyWrite") != PermissionState.GRANTED) {
            call.reject("Storage permission is needed to save a photo on this Android version.");
            return;
        }
        save(call);
    }

    private void save(PluginCall call) {
        String encoded = call.getString("base64");
        if (encoded == null || encoded.isEmpty()) {
            call.reject("No photo was provided.");
            return;
        }

        byte[] jpeg;
        try {
            int comma = encoded.indexOf(',');
            jpeg = Base64.decode(comma >= 0 ? encoded.substring(comma + 1) : encoded, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("Invalid photo data.");
            return;
        }
        if (jpeg.length < 4 || (jpeg[0] & 0xff) != 0xff || (jpeg[1] & 0xff) != 0xd8) {
            call.reject("The photo must be a JPEG image.");
            return;
        }

        String fileName = "phenawa-try-on-" + System.currentTimeMillis() + ".jpg";
        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = null;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Phenawa AI");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IOException("Cannot create gallery entry.");
                try (OutputStream stream = resolver.openOutputStream(uri)) {
                    if (stream == null) throw new IOException("Cannot write gallery photo.");
                    stream.write(jpeg);
                }
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                if (resolver.update(uri, values, null, null) != 1) {
                    throw new IOException("Cannot publish gallery photo.");
                }
            } else {
                Bitmap bitmap = BitmapFactory.decodeByteArray(jpeg, 0, jpeg.length);
                if (bitmap == null) throw new IOException("Cannot decode JPEG photo.");
                try {
                    String saved = MediaStore.Images.Media.insertImage(resolver, bitmap, fileName, "Phenawa AI try-on");
                    if (saved == null) throw new IOException("Cannot save gallery photo.");
                    uri = Uri.parse(saved);
                } finally {
                    bitmap.recycle();
                }
            }
            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            if (uri != null) resolver.delete(uri, null, null);
            call.reject("Failed to save photo to gallery.");
        }
    }
}
