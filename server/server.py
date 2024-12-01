from networkLib import server, Interface, Packet
from copy import deepcopy
import random as r
import time as t
import hashlib
import pickle
import os

try: os.chdir('server')
except: ...

try: passwords = pickle.load(open('accounts.bin','rb'))
except:  passwords = {}

files = os.listdir('files')

# Servers: dict[server id: server data[name: str, icon: bytes, users: list[str]]]
try: servers = pickle.load(open('servers.bin','rb'))
except: servers = {
        5189346598134: {
            "name": "test1",
            "icon": '1.png',
            "owner": "frfr",
            "users": ["frfr", "testuser1"],
            "channels": {
                414534113453534: {
                    "name": "announcements",
                    "description": "frfr ong",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": False,
                            "edit": False
                        }
                    },
                    "messages": {
                        453451345134: {
                            "author": "frfr",
                            "content": "frfr ong",
                            "timestamp": 1728143064
                        }
                    }
                },
                15345134534134: {
                    "name": "discussion",
                    "description": "real",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": True,
                            "edit": True
                        }
                    },
                    "messages": {
                        5134513453: {
                            "author": "joe_mama",
                            "content": "bing chilling",
                            "timestamp": 172814824
                        }
                    }
                }
            },
            "roles": {
                "staff": {
                    "name": "staff",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": True,
                            "edit": True
                        }
                    },
                    "members": ['frfr','testuser1']
                },
                "*": {
                    "name": "everyone",
                    "permissions": {
                        "*": {
                            "read": False,
                            "write": False,
                            "edit": False
                        }
                    },
                    "members": ['frfr', 'testuser1']
                },
            }
        },
        5189351345134: {
            "name": "test2",
            "icon": '1.png',
            "owner": "capade",
            "users": ["capade", "frfr", "testuser2"],
            "channels": {
                153451345345134: {
                    "name": "announcements",
                    "description": "annoucmentments",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": False,
                            "edit": False
                        }
                    },
                    "messages": {
                        3415345134534: {
                            "author": "capade",
                            "content": "did scientist just quantum entangle a living tardigrade!??!?!?!??!???!???!",
                            "timestamp": 1728143069
                        }
                    }
                },
                1345134534513: {
                    "name": "general",
                    "description": "real",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": True
                        }
                    },
                    "messages": {
                        5134513424745: {
                            "author": "joe_mama",
                            "content": "bing chilling",
                            "timestamp": 172814824
                        }
                    }
                }
            },
            "roles": {
                "staff": {
                    "name": "staff",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": True,
                            "edit": True
                        }
                    },
                    "members": ['capade','testuser2']
                },
                "*": {
                    "name": "everyone",
                    "permissions": {
                        "*": {
                            "read": False,
                            "write": False,
                            "edit": False
                        }
                    },
                    "members": ['frfr', 'testuser1']
                },
            }
        }
    }

server_ids = list(servers.keys())

netdebug = True

clients = set()

def get_by_id(id:int):
    for serverId,server in servers.items():
        if serverId == id:
            return server

def get_channel_by_id(serverId:int,channelId:int):
    return get_by_id(serverId)['channels'].get(channelId)

def add_to_role(serverId:int, role, member):
    server = get_by_id(serverId)
    if server is None: return False
    if role not in server['roles']: return False
    server['roles'][role].append(member)
    return True

def remove_from_role(serverId:int, role, member):
    server = get_by_id(serverId)
    if server is None: return False
    if role not in server['roles']: return False
    server['roles'][role].remove(member)
    return True

def get_roles(serverId, user):
    server = get_by_id(serverId)
    if server is None: return []
    return [role for role in server['roles'] if user in server['roles'][role]['members']]

def has_permission(serverId, channelId, member, permission):
    channel = get_channel_by_id(channelId)
    if channel is None: return False

    user_roles = get_roles(serverId, member)

    hasPerm = None
    for role,permissions in channel['permissions'].items():
        if role not in user_roles: continue
        if permissions.get(permission) is None:
            continue
        hasPerm = permissions[permission]

    if hasPerm is None:
        for role in user_roles.values():
            if role['permissions'].get(permission) is None:
                continue
            hasPerm = role['permissions'][permission]

    return hasPerm

def save_all():
    pickle.dump(passwords, open('accounts.bin','wb'))
    pickle.dump(servers,open('servers.bin','wb'))

print('Server started!')

print(files)

# Create server
@server('127.0.0.1', 5000, block=True)
def csHandler(cs:Interface,addr:tuple[str,int]):
    username, password = cs.recv().data.split('\n')

    if not isinstance(password, bytes):
        password = password.encode()

    if username in passwords:
        if hashlib.md5(password).hexdigest() != passwords[username]:
            cs.send(Packet('status', 'INVALID'))
            cs.close()
    else:
        passwords[username] = hashlib.md5(password).hexdigest()

    cs.send(Packet('status', 'OK'))

    print(f"[+] {username} connected.")

    clients.add(cs)

    ## USER DATA
    user_servers = {id:server for id, server in deepcopy(servers).items() if username in server['users']}

    for server in user_servers.values():
        for id,channel in server['channels'].items():
            channel['id'] = id
            channel['messages'] = len(channel['messages'])

    while True:
        packet = cs.recv()

        if packet is None: continue

        if packet is False:
            clients.remove(cs)
            cs.close()
            return

        print(f"Received from {addr}: {packet}")

        args = packet.data.split()

        if packet.type == 'GET':
            if len(args) < 1:
                cs.send(Packet('status','INVALID_REQUEST'))
                continue

            if args[0] == 'servers':
                cs.send(Packet('response', user_servers))

            elif args[0] == 'file':
                if len(args) < 2:
                    cs.send(Packet('status','INVALID_REQUEST'))
                    continue
                if args[1].split('/')[0] not in files:
                    cs.send(Packet('status','NOT_FOUND'))
                else:
                    cs.send(Packet('data', open(f'files/{args[1]}', 'rb').read()))

            elif args[0] == 'messages':
                if len(args) < 3:
                    cs.send(Packet('status','INVALID_REQUEST'))
                    continue
                elif len(args) == 3:
                    args.append(args[-1]+1)

                if int(args[1]) not in server_ids:
                    cs.send(Packet('status','NOT_FOUND'))
                    continue

                server = get_by_id(int(args[1]))

                if not server or int(args[2]) not in server['channels'].keys():
                    cs.send(Packet('status','NOT_FOUND'))
                    continue

                else:
                    messages = list(servers[int(args[1])]['channels'][int(args[2])]['messages'].values())[int(args[3]):int(args[4])]
                    cs.send(Packet('response', messages))

        elif packet.type == 'CREATE':
            if len(args) < 2:
                cs.send(Packet('status','INVALID_REQUEST'))
                continue

            if args[0] == 'server':
                name = args[1]
                id = r.randrange(100000000000000,999999999999999)
                server_ids.append(id)
                servers[id] = {
                    "name": name,
                    "id": id,
                    "icon": 'assets/default/server.png',
                    "users": [username],
                    "channels": {}
                }

            elif args[0] == 'channel':
                serverId = int(args[1])
                name = args[2]

                if serverId not in server_ids:
                    cs.send(Packet('status','NOT_FOUND'))
                    continue

                server = get_by_id(serverId)

                id = r.randrange(100000000000000,999999999999999)

                server['channels'][id] = {
                    "name": name,
                    "id": id,
                    "description": "real",
                    "permissions": {
                        "*": {
                            "read": True,
                            "write": True,
                            "edit": False
                        }
                    },
                    "messages": {}
                }

        elif packet.type == 'SEND':
            if len(args) < 3:
                cs.send(Packet('status','INVALID_REQUEST'))
                continue

            serverId  = int(args[0])
            channelId = int(args[1])

            if serverId not in server_ids:
                cs.send(Packet('status','NOT_FOUND'))
                continue

            server = get_by_id(serverId)

            if channelId not in server['channels'].keys():
                cs.send(Packet('status','NOT_FOUND'))
                continue

            content = ''.join([chr for chr in ' '.join(args[2:]) if chr.isprintable()])

            messageId = r.randint(100000000000000,999999999999999)

            message = {
                    "author": username,
                    "content": content,
                    "timestamp": round(t.time())
                }

            servers[serverId]['channels'][channelId]['messages'][messageId] = message

            cs.send(Packet('status', 'OK'))

        elif packet.type == 'EDIT':
            if args[0] == 'server':
                serverId = int(args[1])
                if serverId not in server_ids:
                    cs.send(Packet('status','NOT_FOUND'))
                    continue

                server = get_by_id(serverId)

                server['name'] = args[1]

            elif args[0] == 'channel':
                serverId = int(args[1])
                channelId = int(args[2])
                if serverId not in server_ids:
                    cs.send(Packet('status','NOT_FOUND'))
                    continue

                server  = get_by_id(serverId)
                channel = get_channel_by_id(serverId,channelId)

                if not channelId:
                    cs.send(Packet('status','NOT_FOUND'))
                    continue

                if not channel['permissions'].get('edit',False):
                    cs.send(Packet('status','FORBIDDEN'))
                    continue

                channel['name'] = args[3]
                channel['description'] = args[4]
                channel['permissions'] = args[5]

save_all()
print("Server stopped.")

