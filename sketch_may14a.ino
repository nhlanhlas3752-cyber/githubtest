bool alarmArmed = false;

const int trigPin = 9;
const int echoPin = 10;

const int buzzer = 6;
const int led = 7;

long duration;
int distance;

void setup() {

  Serial.begin(9600);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  pinMode(buzzer, OUTPUT);
  pinMode(led, OUTPUT);
}

void loop() {

  // Receive commands from Python
  if (Serial.available()) {

    char command = Serial.read();

    if (command == '1') {
      alarmArmed = true;
      Serial.println("Alarm Armed");
    }

    if (command == '0') {

      alarmArmed = false;

      digitalWrite(buzzer, LOW);
      digitalWrite(led, LOW);

      Serial.println("Alarm Disarmed");
    }
  }

  // Only monitor when alarm is armed
  if (alarmArmed) {

    // Send ultrasonic pulse
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);

    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);

    digitalWrite(trigPin, LOW);

    // Read echo
    duration = pulseIn(echoPin, HIGH);

    distance = duration * 0.034 / 2;

    Serial.print("Distance: ");
    Serial.println(distance);

    // Object detected
    if (distance > 0 && distance < 20) {

      // Blink LED
      digitalWrite(led, HIGH);

      // Turn buzzer ON
      digitalWrite(buzzer, HIGH);

      delay(200);

      digitalWrite(led, LOW);

      digitalWrite(buzzer, LOW);

      delay(200);

    } else {

      digitalWrite(led, LOW);
      digitalWrite(buzzer, LOW);
    }
  }
}