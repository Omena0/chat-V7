import engine as ui
import hashlib
import socket
import pickle
import rsa
import os


### LOGIN ###

HOME = os.path.join(os.environ.get('USERPROFILE'), '.chat-v7')

pub,priv = rsa.newkeys(1024)

def connect(addr=('127.0.0.1',5000)):
    global s, pub, priv, serverPub
    s = socket.socket()
    s.connect(addr)
    s.send(pub.save_pkcs1())
    serverPub = rsa.PublicKey.load_pkcs1(s.recv(2048))

def send(data):
    if isinstance(data,str):
        data = data.encode()
    elif not isinstance(data, bytes):
        data = pickle.dumps(data)
    return s.send(rsa.encrypt(data,serverPub))

def recv(bufsize):
    return rsa.decrypt(s.recv(bufsize), priv)

def login():
    global username, password, serverPub
    username = username_field.text
    password = hashlib.md5(password_field.text.encode()).hexdigest()
    send((username, password))

def login_ui():
    global username_field, password_field
    root = ui.Root(
        "Log in to Chat-V7",
        (35,35,80),
        (460,370),
        show_fps=False
    ).show(False)

    # Title
    ui.Text(
        (root.width//2,40),
        "Log in to Chat-V7",
        70,
        color=(120,120,255),
        bg_color=root.bg_color
    ).add(root)

    # Username
    ui.Text(
        (root.width//2,root.height//4),
        "Username:",
        50,
        color = (100,100,200),
        bg_color=root.bg_color
    ).add(root)

    username_field = ui.Textbox(
        (root.width//2-100,root.height//4+20),
        200,
        40,
        40,
        color = (50,50,100),
        hover_color=(60,60,120),
        focus_color=(65,65,130)
    ).add(root)

    # Password
    ui.Text(
        (root.width//2,root.height//4+100),
        "Password:",
        50,
        color = (100,100,200),
        bg_color=root.bg_color
    ).add(root)

    password_field = ui.Textbox(
        (root.width//2-100,root.height//4+120),
        200,
        40,
        40,
        color = (50,50,100),
        hover_color=(60,60,120),
        focus_color=(65,65,130)
    ).add(root)

    # Login button
    ui.Button(
        (root.width//2-100,root.height//4+190),
        200,
        60,
        "Log in",
        50,
        color = (50,50,100),
        hover_color=(60,60,120),
        font_color=(130,130,255),
        action=login
    ).add(root)

    ui.mainloop()


if not os.path.exists(os.path.join(HOME, 'loginData.bin')):
    login_ui()

exit()

### UI ###

root = ui.Root("Chat-V7")



