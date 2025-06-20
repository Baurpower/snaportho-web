export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>SnapOrtho</title>
        <meta name="description" content="Memorize, Master, Excel in Orthopaedics" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* ✅ Twitter base pixel script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,t,n,s,u,a){
                e.twq||(s=e.twq=function(){
                  s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
                },s.version='1.1',s.queue=[],u=t.createElement(n),
                u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
                a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))
              }(window,document,'script');
              twq('config','tw-q0hm1-q0h07'); // ✅ Replace with your real Pixel ID
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
