import serial
import speech_recognition as sr
import pyttsx3
import time

arduino = serial.Serial('COM4', 9600)

time.sleep(2)

recognizer = sr.Recognizer()
engine = pyttsx3.init()

def speak(text):
    engine.say(text)
    engine.runAndWait()

while True:

    with sr.Microphone() as source:

        print("Listening...")
        audio = recognizer.listen(source)

    try:

        command = recognizer.recognize_google(audio)
        print("You said:", command)

        if "turn on the alarm" in command.lower():

            arduino.write(b'1')
            print("Alarm Armed")
            speak("The alarm has been armed and is now active.")

        if "turn off the alarm" in command.lower():

            arduino.write(b'0')
            print("Alarm Disarmed")
            speak("The alarm has been disarmed.")

    except:
        print("Could not understand")