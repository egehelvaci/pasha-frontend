// Containers may inject their machine name as HOSTNAME. Public ingress needs
// the server to listen on every IPv4 interface; keep Railway's PORT untouched.
process.env.HOSTNAME = '0.0.0.0';
require('../.next/standalone/server.js');
