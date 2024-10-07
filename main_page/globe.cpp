#include <emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>

class Satellite {
public:
    double x, y, z;
    double speed;

    Satellite(double x, double y, double z, double speed)
        : x(x), y(y), z(z), speed(speed) {}

    void update(double deltaTime) {
        double radius = std::sqrt(x*x + y*y + z*z);
        double theta = std::atan2(y, x) + speed * deltaTime;
        x = radius * std::cos(theta);
        y = radius * std::sin(theta);
    }
    void mouseDrag(double rotationX, double rotationY){
        double radius = std::sqrt(x*x + y*y + z*z);
        // rotate around x axis
        x = x * std::cos(rotationX) - z * sin(rotationX);
        z = x * std::sin(rotationX) + z * cos(rotationX);
        // rotate around y axis
        z = z * std::cos(rotationY) - y * sin(rotationY);
        y = z * std::sin(rotationY) + y * cos(rotationX);
    }
};

class GlobeController {
private:
    std::vector<Satellite> satellites;

public:
    GlobeController() {
        // Add some sample satellites
        satellites.emplace_back(7, 0, 0, 0.05);
        satellites.emplace_back(0, 7, 0, 0.03);
        satellites.emplace_back(0, 7.5, 0, 0.07);
    }

    void updateSatellites(double deltaTime) {
        for (auto& satellite : satellites) {
            satellite.update(deltaTime);
        }
    }

    void mouseDragSatellites(double rotationX, double rotationY){
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
        return positions;
    }
};

// Wrapper functions for emscripten
EMSCRIPTEN_KEEPALIVE
extern "C" {
    GlobeController* createGlobeController() {
        return new GlobeController();
    }

    void destroyGlobeController(GlobeController* controller) {
        delete controller;
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
}