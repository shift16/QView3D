#! /usr/bin/bash
# This script is used to start up the QView3D application for local development
# `Podman` is used to create containers and `socat` is used to create virtual serial ports

ptyxis --new-window -x 'socat -d -d -d pty,rawer,link=./dev/ttyACM0 -'

# pty,link=./dev/ttyACM1,echo=0

ptyxis --tab -x 'podman container run -it \
    -v /home/cj/Documents/Projects/Qview3D:/root/qview3d:rw,Z \
    -p 10003:9229 \
    -p 10004:8000 \
    -p 3000:3000 \
    -w /root/qview3d \
    --rm \
    --group-add keep-groups \
    --device=./dev/ttyACM0:/dev/ttyACM2 \
    --device=/dev/ttyACM0:/dev/ttyACM0 \
    --device=/dev/ttyACM1:/dev/ttyACM1 \
    localhost/qview3d-base'

#    --device=./dev/ttyACM1:/dev/ttyACM1 \

# node server-javascript/src/test.js

# localhost/qview3d-base node --inspect-brk=0.0.0.0:9229 server-javascript/src/test.js
# --group-add keep-groups \
