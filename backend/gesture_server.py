import cv2
import mediapipe as mp
import asyncio
import websockets
import json

# Force imports for compatibility
try:
    from mediapipe.python.solutions import hands as mp_hands
    from mediapipe.python.solutions import drawing_utils as mp_drawing
except ImportError:
    import mediapipe.solutions.hands as mp_hands
    import mediapipe.solutions.drawing_utils as mp_drawing

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)

smoothed_x, smoothed_y = 0, 0
alpha = 0.2  # smoothing factor

async def gesture_handler(websocket):
    global smoothed_x, smoothed_y
    cap = cv2.VideoCapture(0)

    prev_wrist_x = None
    cooldown = 0

    print("🚀 Gesture Server Connected")

    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                await asyncio.sleep(0.01)
                continue

            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)

            if results.multi_hand_landmarks:
                for hand in results.multi_hand_landmarks:
                    # Draw hand landmarks on the frame
                    mp_drawing.draw_landmarks(
                        frame,
                        hand,
                        mp_hands.HAND_CONNECTIONS,
                        mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                        mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=2)
                    )

                    # --- CURSOR TRACKING ---
                    idx = hand.landmark[8]
                    smoothed_x = (alpha * idx.x) + ((1 - alpha) * smoothed_x)
                    smoothed_y = (alpha * idx.y) + ((1 - alpha) * smoothed_y)

                    await websocket.send(json.dumps({
                        "type": "CURSOR",
                        "x": smoothed_x,
                        "y": smoothed_y
                    }))

                    landmarks = hand.landmark

                    # --- SCROLL ---
                    if landmarks[4].y > landmarks[3].y + 0.05 and landmarks[8].y > landmarks[5].y:
                        await websocket.send(json.dumps({"type": "SCROLL", "dir": "DOWN"}))

                    elif landmarks[8].y > landmarks[5].y and landmarks[12].y > landmarks[9].y:
                        await websocket.send(json.dumps({"type": "SCROLL", "dir": "UP"}))

                    elif landmarks[8].y < landmarks[5].y - 0.05:
                        await websocket.send(json.dumps({"type": "SCROLL", "dir": "STOP"}))

                    # --- SWIPE NAVIGATION (NEXT/BACK) ---
                    wrist_x = landmarks[0].x
                    if prev_wrist_x is not None and cooldown == 0:
                        diff = wrist_x - prev_wrist_x
                        if abs(diff) > 0.15:
                            action = "NEXT" if diff > 0 else "BACK"
                            await websocket.send(json.dumps({
                                "type": "GESTURE",
                                "action": action
                            }))
                            cooldown = 25

                    prev_wrist_x = wrist_x

            if cooldown > 0:
                cooldown -= 1

            # Display the camera feed
            cv2.imshow('Gesture Recognition - Press Q to quit', frame)
            
            # Check for 'q' key to quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            await asyncio.sleep(0.01)

    finally:
        cap.release()
        cv2.destroyAllWindows()

async def main():
    async with websockets.serve(gesture_handler, "localhost", 8080):
        print("🎯 Server running at ws://localhost:8080")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Stopping server...")
