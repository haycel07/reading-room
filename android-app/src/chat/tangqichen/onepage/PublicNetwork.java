package chat.tangqichen.onepage;

import java.io.IOException;
import java.net.*;
import java.util.*;
import javax.net.ssl.*;

/** Resolve once; reject any non-public result and check the actual peer before TLS. */
final class PublicNetwork {
    interface Resolver { InetAddress[] resolve(String host) throws IOException; }

    static boolean publicAddress(InetAddress address) {
        byte[] ip=address.getAddress();
        if(ip.length==4) {
            int a=ip[0]&255,b=ip[1]&255;
            return !(a==0||a==10||a==127||a>=224||a==169&&b==254||a==172&&b>=16&&b<=31||a==192&&(b==0||b==168)||a==100&&b>=64&&b<=127||a==198&&(b==18||b==19||b==51)||a==203&&b==0);
        }
        return ip.length==16&&(ip[0]&0xe0)==0x20&&!(ip[0]==0x20&&ip[1]==1&&ip[2]==0x0d&&(ip[3]&255)==0xb8);
    }

    static InetAddress[] verify(URL url,Resolver resolver) throws IOException {
        if(!"https".equals(url.getProtocol())||url.getUserInfo()!=null||url.getRef()!=null||url.getQuery()!=null||url.getHost().isEmpty()||(url.getPort()!=-1&&url.getPort()!=443)||!url.getPath().endsWith("/chat/completions"))throw new IOException("Public HTTPS Chat Completions endpoint required");
        InetAddress[] addresses=resolver.resolve(url.getHost());
        if(addresses.length==0)throw new IOException("Empty DNS response");
        for(InetAddress address:addresses)if(!publicAddress(address))throw new IOException("Non-public endpoint");
        return addresses;
    }

    static SSLSocketFactory sockets(InetAddress[] addresses) {
        return new SSLSocketFactory() {
            final SSLSocketFactory delegate=(SSLSocketFactory)SSLSocketFactory.getDefault();
            final Set<InetAddress> allowed=new HashSet<>(Arrays.asList(addresses));
            Socket checked(Socket socket,String host,int port,boolean close) throws IOException {
                if(!allowed.contains(socket.getInetAddress())||!publicAddress(socket.getInetAddress())) {
                    socket.close();throw new IOException("DNS peer changed");
                }
                return delegate.createSocket(socket,host,port,close);
            }
            Socket connect(String host,int port,InetAddress local,int localPort) throws IOException {
                Socket socket=new Socket();
                try {
                    if(local!=null)socket.bind(new InetSocketAddress(local,localPort));
                    socket.connect(new InetSocketAddress(addresses[0],port),20000);
                    return checked(socket,host,port,true);
                } catch(IOException e) {socket.close();throw e;}
            }
            @Override public String[] getDefaultCipherSuites(){return delegate.getDefaultCipherSuites();}
            @Override public String[] getSupportedCipherSuites(){return delegate.getSupportedCipherSuites();}
            @Override public Socket createSocket() throws IOException {throw new IOException("Connected verified socket required");}
            @Override public Socket createSocket(Socket socket,String host,int port,boolean close) throws IOException {return checked(socket,host,port,close);}
            @Override public Socket createSocket(String host,int port) throws IOException {return connect(host,port,null,0);}
            @Override public Socket createSocket(String host,int port,InetAddress local,int localPort) throws IOException {return connect(host,port,local,localPort);}
            @Override public Socket createSocket(InetAddress host,int port) throws IOException {return connect(host.getHostAddress(),port,null,0);}
            @Override public Socket createSocket(InetAddress host,int port,InetAddress local,int localPort) throws IOException {return connect(host.getHostAddress(),port,local,localPort);}
        };
    }
}
