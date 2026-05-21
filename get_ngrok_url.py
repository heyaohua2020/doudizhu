import urllib.request, json, sys
d = json.loads(urllib.request.urlopen('http://127.0.0.1:4040/api/tunnels').read())
print(d['tunnels'][0]['public_url'])
