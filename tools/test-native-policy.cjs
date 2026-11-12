// Run the real Java address policy and socket guard on the host JVM, without Android mocks.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/review-fixes/java');fs.mkdirSync(out,{recursive:true});
const roots=[process.env.JAVA_HOME,...[process.env.LOCALAPPDATA,process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local')].filter(Boolean).flatMap(base=>{const p=path.join(base,'OnePageBuild/jdk');return fs.existsSync(p)?fs.readdirSync(p).map(name=>path.join(p,name)):[]})].filter(Boolean);
const suffix=process.platform==='win32'?'.exe':'';
const jdk=roots.find(p=>fs.existsSync(path.join(p,'bin/javac'+suffix)));
const javac=jdk?path.join(jdk,'bin/javac'+suffix):'javac',java=jdk?path.join(jdk,'bin/java'+suffix):'java';
const test=String.raw`package chat.tangqichen.onepage;
import java.net.*;import java.io.*;
public class NativePolicyTest {
 static void check(boolean b){if(!b)throw new AssertionError();}
 static void reject(String url,String...ips)throws Exception{
  try{PublicNetwork.verify(new URL(url),host->{InetAddress[] a=new InetAddress[ips.length];for(int i=0;i<ips.length;i++)a[i]=InetAddress.getByName(ips[i]);return a;});throw new AssertionError(url);}catch(IOException expected){}
 }
 public static void main(String[] args)throws Exception{
  String endpoint="https://api.example.test/v1/chat/completions";
  for(String ip:new String[]{"0.0.0.0","10.0.0.5","127.0.0.1","169.254.169.254","172.16.0.1","192.168.1.1","100.64.0.1","198.18.0.1","224.0.0.1","::1","fc00::1","fe80::1","2001:db8::1","::ffff:127.0.0.1"})reject(endpoint,ip);
  reject(endpoint,"8.8.8.8","10.0.0.1");reject(endpoint);
  for(String url:new String[]{"http://api.test/chat/completions","https://user:pass@api.test/chat/completions","https://api.test:8443/chat/completions","https://api.test/chat/completions?secret=1","https://api.test/chat/completions#fragment","https://api.test/other"})reject(url,"8.8.8.8");
  check(PublicNetwork.verify(new URL(endpoint),host->new InetAddress[]{InetAddress.getByName("8.8.8.8"),InetAddress.getByName("2606:4700:4700::1111")}).length==2);
  final boolean[] closed={false};Socket changed=new Socket(){public InetAddress getInetAddress(){try{return InetAddress.getByName("127.0.0.1");}catch(Exception e){throw new RuntimeException(e);}}public void close(){closed[0]=true;}};
  try{PublicNetwork.sockets(new InetAddress[]{InetAddress.getByName("8.8.8.8")}).createSocket(changed,"api.example.test",443,true);throw new AssertionError();}catch(IOException expected){}
  check(closed[0]);System.out.println("PASS actual Java policy: public DNS only, mixed DNS rejection, URL restrictions and peer-change rejection before TLS; no Android device claim");
 }
}`;
const file=path.join(out,'NativePolicyTest.java');fs.writeFileSync(file,test);
cp.execFileSync(javac,['--release','8','-encoding','UTF-8','-d',out,path.join(root,'android-app/src/chat/tangqichen/onepage/PublicNetwork.java'),file],{stdio:'inherit'});
cp.execFileSync(java,['-cp',out,'chat.tangqichen.onepage.NativePolicyTest'],{stdio:'inherit'});
