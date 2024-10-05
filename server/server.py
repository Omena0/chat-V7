from threading import Thread
import hashlib
import socket
import pickle
import rsa
import os

try: os.chdir('server')
except: ...

try: passwords = pickle.load(open('accounts.bin','rb'))
except:  passwords = {}

files = os.listdir('files')


# Servers: dict[server id: server data[name: str, icon: bytes, users: list[str]]]
try: servers = pickle.load(open('servers.bin','rb'))
except: servers = [
        {
            "name": "test1",
            "icon": '1.png',
            "users": ["frfr"],
            "channels": {
                "announcements": {
                    "description": "frfr ong",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": True
                        }
                    },
                    "messages": [
                        {
                            "author": "frfr",
                            "content": "frfr ong",
                            "timestamp": 1728143064
                        }
                    ]
                }
            }
        }
    ]

pub,priv = rsa.newkeys(2048,accurate=False)

s = socket.socket()

s.bind(('127.0.0.1',5000))

s.listen(5)

client_sockets = set()

def save_all():
    pickle.dump(passwords, open('accounts.bin','wb'))
    pickle.dump(servers,open('servers.bin','wb'))

netdebug = True

def send(cs, data, pub=None):
    if netdebug: print(f'-> {data}')

    if isinstance(data,str):
        data = data.encode()

    elif not isinstance(data, bytes):
        data = pickle.dumps(data)

    if not pub:
        return cs.send(data)

    return cs.send(rsa.encrypt(data,pub))


def recv(cs, encrypted=True):
    data = bytes()
    cs.settimeout(0.1)

    while True:
        try:
            data += cs.recv(1024)

        except:
            if data:
                break

    cs.settimeout(None)

    if not encrypted:
        if netdebug: print(f' <- {data}')
        return data

    data = rsa.decrypt(data, priv)
    if netdebug: print(f' <- {data}')

    return data


def csHandler(cs,addr):
    # Establish encrypted connection
    clientPub = rsa.PublicKey.load_pkcs1(cs.recv(2048))
    cs.send(pub.save_pkcs1())
    username, password = recv(cs).split(b'\n')

    username = username.decode()

    if not isinstance(password, bytes):
        password = password.encode()

    if username in passwords:
        if hashlib.md5(password).hexdigest() != passwords[username]:
            send(cs, "INVALID",clientPub)
            cs.close()
    else:
        passwords[username] = hashlib.md5(password).hexdigest()

    send(cs,'OK',clientPub)

    print(f"[+] {username} connected.")

    client_sockets.add(cs)

    ## USER DATA
    user_servers = [server for server in servers if username in server['users']]

    print(f'User servers: {user_servers}')

    while True:
        data = recv(cs)

        if isinstance(data, bytes):
            try: data = data.decode()
            except:
                print('Decode failed')
                continue

        if not data:
            break

        print(f"Received from {addr}: {data}")

        args = data.split()

        if args[0] == 'GET':
            if args[1] == 'servers':
                send(cs, user_servers, clientPub)

            elif args[1] == 'file':
                if args[2] not in files:
                    send(cs, 'FILE_NOT_FOUND')
                else:
                    send(cs, open(f'files/{args[2]}', 'rb').read())
        
        elif args[0] == 'CREATE':
            if args[1] == 'server':
                name = args[2]
                id = hashlib.sha256(len(servers),usedforsecurity=False)
                servers.append({
                    "name": name,
                    "icon": 'assets/default/server.png.png',
                    "users": [username]
                })


    client_sockets.remove(cs)

print('Server started!')

try:
    while True:
        cs, addr = s.accept()
        Thread(target=csHandler,args=(cs,addr)).start()
except:
    ...


s.close()
save_all()
print("Server stopped.")

