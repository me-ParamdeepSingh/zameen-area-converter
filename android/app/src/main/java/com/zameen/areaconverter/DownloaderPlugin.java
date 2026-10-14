package com.zameen.areaconverter;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "Downloader")
public class DownloaderPlugin extends Plugin {

    @PluginMethod
    public void savePdfToDownloads(PluginCall call) {
        String base64Data = call.getString("base64");
        String filename = call.getString("filename");
        Boolean openAfterSave = call.getBoolean("openAfterSave", false);

        if (base64Data == null || filename == null) {
            call.reject("Missing base64 data or filename");
            return;
        }

        try {
            byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Uri savedUri = null;
            String savedPath = "";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Scoped Storage: MediaStore.Downloads
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                savedUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                if (savedUri != null) {
                    try (OutputStream os = resolver.openOutputStream(savedUri)) {
                        if (os != null) {
                            os.write(pdfBytes);
                            os.flush();
                        }
                    }
                    savedPath = Environment.DIRECTORY_DOWNLOADS + "/" + filename;
                }
            }

            // Fallback for Android 9 or if MediaStore insertion returned null
            if (savedUri == null) {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs();
                }
                File file = new File(downloadsDir, filename);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(pdfBytes);
                    fos.flush();
                }
                MediaScannerConnection.scanFile(
                    getContext(),
                    new String[]{file.getAbsolutePath()},
                    new String[]{"application/pdf"},
                    null
                );
                savedUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
                );
                savedPath = file.getAbsolutePath();
            }

            // Optionally open the downloaded PDF in viewer
            if (openAfterSave && savedUri != null) {
                try {
                    Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                    viewIntent.setDataAndType(savedUri, "application/pdf");
                    viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    Intent chooser = Intent.createChooser(viewIntent, "Open PDF with");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(chooser);
                } catch (Exception ex) {
                    // Ignored if no PDF reader installed
                }
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("filename", filename);
            result.put("path", savedPath);
            result.put("uri", savedUri != null ? savedUri.toString() : "");
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to save PDF to Downloads: " + e.getMessage(), e);
        }
    }
}
