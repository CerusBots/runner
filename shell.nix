with import <nixpkgs> {};

stdenv.mkDerivation {
    name = "cerus-runner";
    buildInputs = [
        nodejs-16_x tilt minikube python2 pulumi-bin awscli krew kubectl
    ];
    shellHooks = ''
        export PATH="$PWD/node_modules/.bin/:$PATH:$HOME/.krew/bin"
        alias run="npm run"
    '';
}
