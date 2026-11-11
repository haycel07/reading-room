import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.*;
import java.security.*;
import java.security.cert.X509Certificate;
import java.util.*;

public final class SignApk {
    public static void main(String[] args) throws Exception {
        if (args[0].equals("verify")) {
            ApkVerifier.Result result = new ApkVerifier.Builder(new File(args[1])).build().verify();
            if (!result.isVerified()) throw new IllegalStateException(result.getErrors().toString());
            System.out.println("APK signature verified; v1=" + result.isVerifiedUsingV1Scheme() + "; v2=" + result.isVerifiedUsingV2Scheme() + "; v3=" + result.isVerifiedUsingV3Scheme());
            for (X509Certificate certificate : result.getSignerCertificates()) {
                byte[] digest = MessageDigest.getInstance("SHA-256").digest(certificate.getEncoded());
                StringBuilder hex = new StringBuilder();
                for (byte value : digest) hex.append(String.format("%02x", value & 0xff));
                System.out.println("Signer certificate SHA256: " + hex);
                if (args.length > 2 && !hex.toString().equalsIgnoreCase(args[2]))
                    throw new IllegalStateException("Signing certificate differs from the established release identity");
            }
            return;
        }
        char[] password = System.getenv("ONEPAGE_KEY_PASSWORD").toCharArray();
        KeyStore keys = KeyStore.getInstance("PKCS12");
        try (InputStream stream = new FileInputStream(args[2])) { keys.load(stream, password); }
        PrivateKey key = (PrivateKey) keys.getKey("onepage", password);
        X509Certificate cert = (X509Certificate) keys.getCertificate("onepage");
        ApkSigner.SignerConfig signer = new ApkSigner.SignerConfig.Builder("onepage", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(signer)).setInputApk(new File(args[0])).setOutputApk(new File(args[1])).setV1SigningEnabled(true).setV2SigningEnabled(true).setV3SigningEnabled(true).build().sign();
    }
}
