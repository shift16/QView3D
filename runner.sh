#! /usr/bin/bash
# This script is used to start up the QView3D application for local development on Linux
# `Podman` is used to create containers and `socat` is used to create virtual serial ports
# Ptyxis is the default terminal emulator on Fedora 41+ and all future versions of Ubuntu

serial_ports=$(find /dev -name 'ttyACM*' -o -name 'ttyUSB*')

# If no serial ports are found, then virtual ones will be created
if [ -z "$serial_ports" ]; then
    # Create 3 virtual serial ports using socat
    ptyxis --new-window -x 'socat pty,rawer,link=./dev/ttyACM0 pty,rawer,link=./dev/virtualPort1'
    ptyxis --tab -x 'socat pty,rawer,link=./dev/ttyACM1 pty,rawer,link=./dev/virtualPort2'
    ptyxis --tab -x 'socat pty,rawer,link=./dev/ttyACM2 pty,rawer,link=./dev/virtualPort3'

    # Start the container
    ptyxis --tab -x 'podman container run \
        -v /home/cj/Documents/Projects/Qview3D:/root/qview3d:rw,Z \
        -p 10003:9229 \
        -p 10004:8000 \
        -p 3000:3000 \
        -w /root/qview3d \
        --rm \
        --device=./dev/ttyACM0:/dev/ttyACM0 \
        --device=./dev/ttyACM1:/dev/ttyACM1 \
        --device=./dev/ttyACM2:/dev/ttyACM2 \
        --device=./dev/virtualPort1:/dev/virtualPort1 \
        --device=./dev/virtualPort2:/dev/virtualPort2 \
        --device=./dev/virtualPort3:/dev/virtualPort3 \
        --replace \
        --name qview3d \
        -e NVM_DIR=/root/.nvm \
        -it localhost/qview3d-base bash -c "source $NVM_DIR/nvm.sh && node virt-printer/index.js & bash"'
else
    ptyxis --new-window -x 'podman container run -it \
        -v /home/cj/Documents/Projects/Qview3D:/root/qview3d:rw,Z \
        -p 10003:9229 \
        -p 10004:8000 \
        -p 3000:3000 \
        -w /root/qview3d \
        --rm \
        --replace \
        --name qview3d \
        --group-add keep-groups \
        --device=/dev/ttyACM0:/dev/ttyACM0 \
        --device=/dev/ttyACM1:/dev/ttyACM1 \
        localhost/qview3d-base'
fi

# Enable debugging
# localhost/qview3d-base node --inspect-brk=0.0.0.0:9229 server-javascript/src/test.js
