// Generates a self-signed cert for the local HTTPS server if one doesn't exist.
// Uses the `selfsigned` package so no system openssl is required.
const fs = require("fs");
const path = require("path");
const selfsigned = require("selfsigned");

const certDir = path.join(__dirname, "..", "certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
	console.log("Certificate already exists at certs/, skipping generation.");
	process.exit(0);
}

fs.mkdirSync(certDir, { recursive: true });

const attrs = [{ name: "commonName", value: "localhost" }];
const pems = selfsigned.generate(attrs, {
	days: 3650,
	keySize: 2048,
	algorithm: "sha256",
	extensions: [
		{
			name: "subjectAltName",
			altNames: [
				{ type: 2, value: "localhost" }, // DNS
				{ type: 7, ip: "127.0.0.1" }, // IP
			],
		},
	],
});

fs.writeFileSync(certPath, pems.cert);
fs.writeFileSync(keyPath, pems.private);
console.log("Generated self-signed certificate at certs/cert.pem and certs/key.pem");
