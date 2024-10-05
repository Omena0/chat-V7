import tkinter.messagebox
import engine as ui
import webbrowser
import hashlib
import socket
import pickle
import rsa
import os

newsText = """
Welcome to Chat-V7!
A private and
completely anonymous
chat application,
with end-to-end
encryption.
It's free, open source,
and easily expandable.

Please report bugs in
the github issues page!
Thanks!
"""


### LOGIN ###

HOME = os.path.join(os.environ.get('USERPROFILE'), '.chat-v7')

os.makedirs(HOME, exist_ok=True)

pub,priv = rsa.newkeys(2048,accurate=False)

def connect(addr=('127.0.0.1',5000)):
    """Establish encrypted connection"""
    global s, pub, priv, serverPub
    s = socket.socket()
    s.connect(addr)
    s.send(pub.save_pkcs1())
    serverPub = rsa.PublicKey.load_pkcs1(s.recv(2048))


def send(data, encrypted=True):
    if isinstance(data,str):
        data = data.encode()

    elif not isinstance(data, bytes):
        data = pickle.dumps(data)

    if not encrypted:
        return s.send(data)

    return s.send(rsa.encrypt(data,serverPub))


def recv(encrypted=True):
    data = bytes()
    s.settimeout(0.1)

    while True:
        try:
            data += s.recv(1024)
        except:
            if data:
                break

    s.settimeout(None)

    if not encrypted: return data

    return rsa.decrypt(data, priv)


def get(thing, type=None):
    send(f'GET {"file" if type == "file" else ""} {thing}')
    data = recv(type != 'file')

    print(data)

    if type in {None, 'file'}:
        return data

    elif type == 'list':
        return data.splitlines()

    elif type == 'object':
        return pickle.loads(data)

    elif type == 'string':
        return data.decode()
    
    raise ValueError('Invalid type')


def _login():
    global username, password, serverPub
    username = username_field.text
    password = hashlib.md5(password_field.text.encode()).hexdigest()
    send(f'{username}\n{password}')

    status = recv().decode()
    if status == 'INVALID':
        tkinter.messagebox.showerror("Invalid credentials", "Please check your credentials and try again")
        return False

    ui.running = False
    with open(os.path.join(HOME, 'loginData.bin'), 'w') as f:
        f.write(f'{username}\n{password}')

    return True


def login_ui():
    global username_field, password_field, login_root
    login_root = ui.Root(
        "Log in to Chat-V7",
        (35,35,80),
        (460,370),
        show_fps=True
    ).show(False)

    # Title
    ui.Text(
        (login_root.width//2,20),
        "Log in to Chat-V7",
        70,
        color=(120,120,255),
        bg_color=login_root.bg_color
    ).add(login_root)

    # Username
    ui.Text(
        (115,login_root.height//4-10),
        "Username:",
        50,
        color = (100,100,200),
        bg_color=login_root.bg_color
    ).add(login_root)

    username_field = ui.Textbox(
        (15,login_root.height//4+30),
        200,
        40,
        40,
        color = (50,50,100),
        hover_color=(60,60,120),
        focus_color=(65,65,130)
    ).add(login_root)

    # Password
    ui.Text(
        (115,login_root.height//4+90),
        "Password:",
        50,
        color = (100,100,200),
        bg_color=login_root.bg_color
    ).add(login_root)

    password_field = ui.Textbox(
        (15,login_root.height//4+130),
        200,
        40,
        40,
        color = (50,50,100),
        hover_color=(60,60,120),
        focus_color=(65,65,130)
    ).add(login_root)

    # Login button
    ui.Button(
        (15,login_root.height//4+205),
        200,
        60,
        "Log in",
        50,
        color = (50,50,100),
        hover_color=(60,60,120),
        font_color=(130,130,255),
        action=_login
    ).add(login_root)

    # News
    ui.Text(
        (340,65),
        newsText,
        28,
        color = (80,80,160),
        bg_color=login_root.bg_color
    ).add(login_root)

    # Github button
    ui.Button(
        (login_root.width-215,login_root.height//4+205),
        200,
        60,
        "Github",
        50,
        color = (50,50,100),
        hover_color=(60,60,120),
        font_color=(130,130,255),
        action=lambda: webbrowser.open('https://github.com/Omena0/chat-V7')
    ).add(login_root)

    ui.mainloop()


def login():
    if not os.path.exists(os.path.join(HOME, 'loginData.bin')):
        login_ui()

    else:
        with open(os.path.join(HOME, 'loginData.bin'), 'r') as f:
            username, password = f.read().split('\n')

        send(f'{username}\n{password}')
        status = recv().decode()
        if status == 'INVALID':
            tkinter.messagebox.showerror("Invalid credentials", "Please check your credentials and try again")

