from dataclasses import dataclass
from threading import Thread
from typing import NoReturn
from typing import Any
import pickle
import socket
import zstd
import rsa

KEYSIZE = 1024

@dataclass
class Packet:
    type: str
    data: Any

    def __str__(self):
        return f'Packet({self.type}, {self.data})'

    @property
    def json(self):
        return {'type': self.type, 'data': self.data}

    @property
    def bytes(self):
        return zstd.compress(pickle.dumps(self.json),10)

    @staticmethod
    def fromDict(dict):
        return Packet(**dict)

    @staticmethod
    def fromBytes(bytes):
        return Packet.fromDict(pickle.loads(zstd.decompress(bytes)))


class Client:
    def __init__(self, ip, port):
        self.addr = ip,port
        self.s = socket.socket()
        self.s.settimeout(5)
        self.pub, self.priv = rsa.newkeys(KEYSIZE)

    def connect(self):
        self.s.connect(self.addr)
        self.s.sendall(self.pub.save_pkcs1())
        self.server_pub = rsa.PublicKey.load_pkcs1(self.s.recv(4096))

    def send(self, packet:Packet):
        print(packet)
        data = pickle.dumps(packet.data)

        for i in range(len(data)//64+1):
            if i >= len(data)//64: type = packet.type
            else: type = 'chunk'

            packetData = Packet(type, data[i*64:i*64+64]).bytes

            crypto = rsa.encrypt(packetData, self.server_pub)
            self.s.sendall(crypto)

    def recv(self) -> Packet | None:
        try: crypto = self.s.recv(128)
        except: return None

        try: data = rsa.decrypt(crypto, self.priv)
        except: return None

        packet = Packet.fromBytes(data)

        if packet.type == 'chunk':
            nextPacket = self.recv()
            packet = Packet(nextPacket.type, packet.data + nextPacket.data)

        try:
            packet.data = pickle.loads(packet.data)
        except: ...

        return packet

class Interface:
    def __init__(self, cs, client_pub, pub, priv):
        self.cs:socket.socket = cs
        self.client_pub = client_pub
        self.pub, self.priv = pub, priv

    def send(self, packet:Packet):
        data = pickle.dumps(packet.data)

        for i in range(len(data)//64+1):
            if i == len(data)//64: type = packet.type
            else: type = 'chunk'

            packetData = Packet(type, data[i*64:i*64+64]).bytes

            crypto = rsa.encrypt(packetData, self.client_pub)
            self.cs.sendall(crypto)

    def recv(self) -> Packet | None:
        """Receive a packet from the client

        Returns:
            Packet: Received packet
        """
        try: crypto = self.cs.recv(128)
        except: return None

        try: data = rsa.decrypt(crypto, self.priv)
        except:
            print('decryption failed')
            return False

        packet = Packet.fromBytes(data)

        if packet.type == 'chunk':
            nextPacket = self.recv()
            packet = Packet(nextPacket.type, packet.data + nextPacket.data)

        try:
            packet.data = pickle.loads(packet.data)
        except: ...

        return packet

    def close(self):
        self.cs.close()

def server(ip, port, block=False):
    def inner(func):
        s = Server(ip, port, func)
        if block: s.start_blocking()
        else: s.start()
    return inner

class Server:
    def __init__(self, ip, port, csHandler):
        self.addr = ip,port
        self.csHandler = csHandler

        self.s = socket.socket()
        self.s.settimeout(10)
        self.pub, self.priv = rsa.newkeys(KEYSIZE)

    def start_blocking(self) -> NoReturn:
        self.s.bind(self.addr)
        self.s.listen(5)

        while True:
            try:
                cs, addr = self.s.accept()
                client_pub = rsa.PublicKey.load_pkcs1(cs.recv(4096))
                inter = Interface(cs, client_pub, self.pub, self.priv)
                Thread(target=self.csHandler, args=(inter,addr)).start()
                cs.sendall(self.pub.save_pkcs1())
            except:
                ...

    def start(self):
        Thread(target=self.start_blocking).start()


if __name__ == "__main__":
    @server('127.0.0.1', 8080)
    def handler(inter:Interface,addr):
        print(f"Connected to {addr}")
        while True:
            packet = inter.recv()
            print(packet.data)

    c = Client('127.0.0.1', 8080)
    c.connect()
    c.send(Packet('test','Hello world frfr ong'))
