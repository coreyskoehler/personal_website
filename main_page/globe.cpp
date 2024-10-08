#include <emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <string>
#include <unordered_map>

// Define a macro for logging
#define LOG(msg) emscripten_log(EM_LOG_CONSOLE, "%s", msg)


class Satellite {
public:
    double x, y, z;
    double speed;
    char letter;
    double rotation;  // New rotation value

    Satellite(double x, double y, double z, double speed, char letter, double rotation)
        : x(x), y(y), z(z), speed(speed), letter(letter), rotation(rotation) {}

    void update(double deltaTime) {
        if (speed != 0.0) {
            double radius = std::sqrt(x*x + y*y + z*z);
            double theta = std::atan2(y, x);
            double phi = std::acos(z / radius);

            // Update theta based on speed
            theta += speed * deltaTime;

            // Convert back to Cartesian coordinates
            x = radius * std::sin(phi) * std::cos(theta);
            y = radius * std::sin(phi) * std::sin(theta);
            z = radius * std::cos(phi);
        }
    }

    void mouseDrag(double angleX, double angleY) {
        double tempX = x * std::cos(angleY) - z * std::sin(angleY);
        double tempZ = x * std::sin(angleY) + z * std::cos(angleY);
        x = tempX;
        z = tempZ;

        // Rotate around X-axis (up-down)
        double tempY = y * std::cos(angleX) - z * std::sin(angleX);
        z = y * std::sin(angleX) + z * std::cos(angleX);
        y = tempY;
    }
};

class GlobeController {
private:
    std::vector<Satellite> satellites;
    std::unordered_map<char, std::vector<std::vector<double>>> letterPositions;

    void initializeLetterPositions() {
        // Define letter shapes (simplified for this example)
        //letterPositions['R'] = {{0,0}, {0,0.0872665}, {0,2*0.0872665}, {1*0.0872665,2*0.0872665}, {2*0.0872665,1*0.0872665}, {0.0872665,0.0872665}, {2*0.0872665,0}};
        letterPositions['R'] = {{0, 0, 0}, {0.03,0.03, M_PI/2}};
        letterPositions['E'] = {{0, 0, 0}, {0.03,0.03, M_PI/2}, {0.01, 0.03, 4*M_PI/6}, {-0.03, 0.03, M_PI/2}};
        letterPositions['S'] = {{0.03,0.03, M_PI/2}, {0.0,0.03, M_PI/4},  {-0.03, 0.03, M_PI/2}};
        letterPositions['U'] = {{0, 0, 0}, {0.0,0.06, 0},  {-0.03, 0.03, M_PI/2}};
        letterPositions['M'] = {{0, 0, 0}, {0.0,0.015, M_PI/6}, {0.0,0.045, 5*M_PI/6},  {0, 0.06, 0},};
        // Add more letters as needed
         LOG("Letter positions initialized");
    }

public:
    GlobeController() {
        initializeLetterPositions();
        LOG("GlobeController constructed");
    }

    void createSatellitesFromString(const std::string& text, double baseRadius = 7.0, double letterSpacing = 0.5) {
        LOG(("Creating satellites for text: " + text).c_str());
        satellites.clear();
        double angleStep = 0.085;
        double currentAngle = 0;

        for (char c : text) {
            if (letterPositions.find(std::toupper(c)) != letterPositions.end()) {
                int pointCount = letterPositions[std::toupper(c)].size();
                double pointAngleStep = 5 * M_PI / 180.0; // 5 degrees in radians

                for (int i = 0; i < pointCount; ++i) {
                    const auto& pos = letterPositions[std::toupper(c)][i];
                    double pointAngle = pos[1] + currentAngle;

                    // Calculate position on the sphere
                    double x = baseRadius * std::cos(pos[0]) * std::cos(pointAngle);
                    double y = baseRadius * std::sin(pos[0]);
                    double z = -baseRadius * std::cos(pos[0]) * std::sin(pointAngle);

                    satellites.emplace_back(x, y, z, 0.00, c, pos[2]);
                }
            }
            currentAngle += angleStep;
        }
        LOG(("Created " + std::to_string(satellites.size()) + " satellites").c_str());
    }

    void updateSatellites(double deltaTime) {
        for (auto& satellite : satellites) {
            satellite.update(deltaTime);
        }
    }

    void mouseDragSatellites(double rotationX, double rotationY) {
        for (auto& satellite : satellites) {
            satellite.mouseDrag(rotationX, rotationY);
        }
    }

     std::vector<double> getSatellitePositions() {
        std::vector<double> positions;
        for (const auto& satellite : satellites) {
            positions.push_back(satellite.x);
            positions.push_back(satellite.y);
            positions.push_back(satellite.z);
        }
        //LOG(("Getting positions for " + std::to_string(satellites.size()) + " satellites").c_str());
        return positions;
    }

    std::vector<char> getSatelliteLetters() {
        std::vector<char> letters;
        for (const auto& satellite : satellites) {
            letters.push_back(satellite.letter);
        }
        //LOG(("Getting letters for " + std::to_string(satellites.size()) + " satellites").c_str());
        return letters;
    }

    std::vector<double> getSatelliteRotations() {
        std::vector<double> rotations;
        for (const auto& satellite : satellites) {
            rotations.push_back(satellite.rotation);
        }
        return rotations;
    }

    void setSatelliteRotation(int index, double rotation) {
        if (index >= 0 && index < satellites.size()) {
            satellites[index].rotation = rotation;
        }
    }


};

// Wrapper functions for emscripten
EMSCRIPTEN_KEEPALIVE
extern "C" {
    GlobeController* createGlobeController() {
        LOG("Creating GlobeController");
        return new GlobeController();
    }

    void destroyGlobeController(GlobeController* controller) {
        LOG("Destroying GlobeController");
        delete controller;
    }

    void createSatellitesFromString(GlobeController* controller, const char* text) {
        LOG(("Creating satellites from string: " + std::string(text)).c_str());
        controller->createSatellitesFromString(std::string(text));
    }

    void updateSatellites(GlobeController* controller, double deltaTime) {
        controller->updateSatellites(deltaTime);
    }

    void mouseDragSatellites(GlobeController* controller, double rotationX, double rotationY) {
        controller->mouseDragSatellites(rotationX, rotationY);
    }

    void getSatellitePositions(GlobeController* controller, double* positions) {
        auto pos = controller->getSatellitePositions();
        for (size_t i = 0; i < pos.size(); ++i) {
            positions[i] = pos[i];
        }
    }

    void getSatelliteLetters(GlobeController* controller, char* letters) {
        auto let = controller->getSatelliteLetters();
        for (size_t i = 0; i < let.size(); ++i) {
            letters[i] = let[i];
        }
    }

    void getSatelliteRotations(GlobeController* controller, double* rotations) {
        auto rots = controller->getSatelliteRotations();
        for (size_t i = 0; i < rots.size(); ++i) {
            rotations[i] = rots[i];
        }
    }

    void setSatelliteRotation(GlobeController* controller, int index, double rotation) {
        controller->setSatelliteRotation(index, rotation);
    }

    int getSatelliteCount(GlobeController* controller) {
        return controller->getSatelliteRotations().size();
    }
}