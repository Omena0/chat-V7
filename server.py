from threading import Thread
import socket
import pickle
import rsa

pub,priv = rsa.newkeys(1024)

s = socket.socket()

s.bind(('127.0.0.1',5000))

s.listen(5)

client_sockets = set()

def send(cs,data,pub):
    if isinstance(data,str):
        data = data.encode()
    elif not isinstance(data, bytes):
        data = pickle.dumps(data)
    return s.send(rsa.encrypt(data, pub))

def recv(bufsize):
    return rsa.decrypt(s.recv(bufsize), priv)

def csHandler(cs,addr):
    clientPub = cs.recv(2048)
    print(f"[+] {addr} connected.")
    client_sockets.add(cs)
    while True:
        data = cs.recv(1024).decode()
        if not data:
            break

        print(f"Received from {addr}: {data}")
        cs.send(data.upper().encode())

    client_sockets.remove(cs)


while True:
    cs,addr = s.accept()
    Thread(target=csHandler,args=(cs,addr)).start()
