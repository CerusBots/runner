with import <nixpkgs> {};

stdenv.mkDerivation {
    name = "cerus-runner";
    buildInputs = [
        nodejs-16_x tilt minikube python2 pulumi-bin
    ];
    shellHooks = ''
        export PATH="$PWD/node_modules/.bin/:$PATH"
        alias run="npm run"
        alias kubectl="minikube kubectl --"
    '';
}
