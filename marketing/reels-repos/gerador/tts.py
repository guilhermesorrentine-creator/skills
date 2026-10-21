# Narração em pt-BR com Kokoro: mistura de estilos de voz (soa menos robótico que uma voz pura),
# velocidade levemente acima de 1 e geração frase a frase. Uso:
#   python tts.py saida.wav "texto" --mix pm_alex:0.75,pm_santa:0.25 --speed 1.08
import argparse
import os

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

CACHE = os.path.expanduser("~/.cache/hyperframes/tts")

p = argparse.ArgumentParser()
p.add_argument("out")
p.add_argument("text")
p.add_argument("--mix", default="pm_alex:1")
p.add_argument("--speed", type=float, default=1.0)
a = p.parse_args()

k = Kokoro(f"{CACHE}/models/kokoro-v1.0.onnx", f"{CACHE}/voices/voices-v1.0.bin")
style = None
for part in a.mix.split(","):
    name, w = part.split(":")
    v = k.get_voice_style(name) * float(w)
    style = v if style is None else style + v
samples, rate = k.create(a.text, voice=style, speed=a.speed, lang="pt-br")
sf.write(a.out, samples.astype(np.float32), rate)
print(f"{a.out} {len(samples) / rate:.2f}s")
