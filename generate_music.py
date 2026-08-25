import wave
import math
import struct

sample_rate = 44100
# Notes frequencies (C major scale upbeat melody)
notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]
melody = [0, 2, 4, 5, 4, 2, 0, 4, 5, 7, 5, 4, 2, 0]
duration_per_note = 0.25 # seconds

audio_data = bytearray()
for note_idx in melody:
    freq = notes[note_idx % len(notes)]
    num_samples = int(sample_rate * duration_per_note)
    for i in range(num_samples):
        t = i / sample_rate
        # Envelope for smooth sound
        envelope = 0.5 * (1 - math.cos(2 * math.pi * i / num_samples))
        val = int(32767 * 0.5 * math.sin(2 * math.pi * freq * t) * envelope)
        audio_data.extend(struct.pack('<h', val))

desktop_path = r"C:\Users\Atrin ay\Desktop\tataloo_ahang_shad.wav"
with wave.open(desktop_path, 'w') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(sample_rate)
    wf.writeframes(audio_data)

print("Generated upbeat music file at:", desktop_path)
