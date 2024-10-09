#include <emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <string>
#include <unordered_map>

// Define a macro for logging
#define LOG(msg) emscripten_log(EM_LOG_CONSOLE, "%s", msg)

class Satellite
{
public:
    double x, y, z;
    double speed;
    char letter;
    double rotation; // New rotation value

    Satellite(double x, double y, double z, double speed, char letter, double rotation)
        : x(x), y(y), z(z), speed(speed), letter(letter), rotation(rotation) {}

    void update(double deltaTime)
    {
        if (speed != 0.0)
        {
            double radius = std::sqrt(x * x + y * y + z * z);
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

    void mouseDrag(double angleX, double angleY)
    {
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

class GlobeController
{
private:
    std::vector<Satellite> satellites;
    std::unordered_map<char, std::vector<std::vector<double>>> letterPositions;
    std::vector<std::pair<int, int>> words;
    std::vector<std::string> wordLinks;

    void initializeLetterPositions()
    {
        // Define letter shapes (simplified for this example)
        letterPositions['R'] = {{0, 0, 0, 1}, {0.015, 0.005, 4 * M_PI / 10, 0.95}};
        letterPositions['E'] = {{0, 0, 0, 1}, {0.03, 0.03, M_PI / 2, 0.99}, {0.005, 0.03, M_PI / 2, 0.97}, {-0.03, 0.03, M_PI / 2, 0.98}};
        letterPositions['S'] = {{0.03, 0.03, M_PI / 2, 1}, {0.0, 0.03, M_PI / (4.2), 0.95}, {-0.03, 0.03, M_PI / 2, 0.97}};
        letterPositions['U'] = {{0, 0, 0, 1}, {0.0, 0.06, 0, 0.98}, {-0.03, 0.045, M_PI / 2, 0.95}};
        letterPositions['M'] = {{0, 0, 0, 1}, {0.0, 0.025, M_PI / 6, 0.95}, {0.0, 0.045, 5 * M_PI / 6, 0.96}, {0, 0.06, 0, 1}};
        letterPositions['L'] = {{0, 0.06, 0, 1}, {-0.03, 0.06, M_PI / 2, 0.95}};
        letterPositions['I'] = {{0.00, 0.03, 0, 0.92}};
        letterPositions['N'] = {{0, 0, 0, 0.92}, {0.0, 0.06, 0, 0.9}, {0.03, 0.03, M_PI / 2, 0.89}};
        letterPositions['K'] = {{0, 0.01, 0, 1}, {-0.03, 0.035, M_PI / 4, 0.78}, {0.03, 0.035, 3 * M_PI / 4, 0.80}};
        letterPositions['D'] = {{0, 0.01, 0, 1}, {0.03, 0.045, M_PI / 4, 0.95}, {-0.03, 0.045, 3 * M_PI / 4, 0.93}};
        letterPositions['G'] = {{-0.01, 0.09, 0, 1.0}, {0.02, -0.05, 0, 0.78}, {-0.01, -0.04, M_PI / 2, 0.75}, {-0.06, -0.05, M_PI / 2, 0.75}, {0.04, 0.01, M_PI / 2, 0.83}};
        letterPositions['T'] = {{0, 0.015, 0, 0.92}, {0.03, 0.03, M_PI / 2, 1}};
        letterPositions['H'] = {{0, 0.00, 0, 1}, {0, 0.06, 0, 1}, {0.00, 0.03, M_PI / 2, 0.89}};
        // letterPositions['B'] = {{0, 0.03, 0, 1}, {0, 0.2, 0, 0.75}, {0.00, 0.09, M_PI/2, 0.89}, {-0.03, 0.09, M_PI/2, 0.89}};
        letterPositions['B'] = {{0, 0.015, 0, 1}, {-0.01, 0.25, M_PI / 4, 0.73}, {0.00, 0.09, M_PI / 2, 0.89}, {-0.03, 0.09, M_PI / 2, 0.89}};
        // Add more letters as needed
        LOG("Letter positions initialized");
    }

public:
    GlobeController()
    {
        initializeLetterPositions();
        satellites.emplace_back(7, -1, -1, 0.005, ' ', 1);
        satellites.emplace_back(-1, 7, 1, 0.03, ' ', 1);
        satellites.emplace_back(1, 7.5, -1, 0.07, ' ', 1);
        satellites.emplace_back(7, 1, 1, 0.005, ' ', 1);
        satellites.emplace_back(-1, 7, 2, 0.03, ' ', 1);
        satellites.emplace_back(1, 7.5, -2, 0.07, ' ', 1);
        satellites.emplace_back(-6, 3, 2, 0.04, ' ', 1);
        satellites.emplace_back(5, -4, 1, 0.06, ' ', 1);
        satellites.emplace_back(2, 6, -3, 0.02, ' ', 1);
        satellites.emplace_back(-4, -5, 2, 0.08, ' ', 1);
        satellites.emplace_back(3, 3, 6, 0.03, ' ', 1);
        satellites.emplace_back(-5, 1, 5, 0.005, ' ', 1);
        satellites.emplace_back(1, -7, -1, 0.07, ' ', 1);
        satellites.emplace_back(6, 2, -4, 0.04, ' ', 1);
        satellites.emplace_back(-3, -6, 3, 0.001, ' ', 1);
        satellites.emplace_back(8, -1, 1, 0.005, ' ', 1);
        satellites.emplace_back(1, 8.5, -1, 0.03, ' ', 1);
        satellites.emplace_back(2, 7, 1, 0.07, ' ', 1);
        satellites.emplace_back(7.5, 1, -1, 0.005, ' ', 1);
        satellites.emplace_back(-1, 7.5, 1, 0.03, ' ', 1);
        satellites.emplace_back(1, 8.5, -2, 0.07, ' ', 1);
        satellites.emplace_back(-6.5, 3.5, 2.5, 0.04, ' ', 1);
        satellites.emplace_back(6, -5, 1.5, 0.06, ' ', 1);
        satellites.emplace_back(2.5, 7, -3.5, 0.02, ' ', 1);
                LOG("GlobeController constructed");
    }

    void createSatellitesFromString(const std::string &text, double startPhi, double startTheta, const std::string &link, double speed, double baseRadius = 7.0, double letterSpacing = 0.5)
    {
        LOG(("Creating satellites for text: " + text).c_str());
        double angleStep = 0.085;
        double currentTheta = startTheta;
        int sizePrev = satellites.size();
        int sizeNow = sizePrev;

        for (char c : text)
        {
            if (letterPositions.find(std::toupper(c)) != letterPositions.end())
            {
                int pointCount = letterPositions[std::toupper(c)].size();

                for (int i = 0; i < pointCount; ++i)
                {
                    const auto &pos = letterPositions[std::toupper(c)][i];
                    double localPhi = pos[0];   // Vertical offset within the letter
                    double localTheta = pos[1]; // Horizontal offset within the letter

                    // Calculate phi and theta
                    double phi = startPhi + localPhi;
                    double theta = currentTheta - localTheta;

                    // Convert to Cartesian coordinates
                    double x = baseRadius * std::cos(theta) * std::cos(phi);
                    double y = baseRadius * std::sin(phi);
                    double z = baseRadius * std::sin(theta) * std::cos(phi);

                    // Apply scaling factor
                    double scale = pos[3];
                    x *= scale;
                    y *= scale;
                    z *= scale;

                    satellites.emplace_back(x, y, z, speed, c, pos[2]);
                }
                sizeNow += pointCount;
            }
            currentTheta -= angleStep;
        }
        words.push_back({sizePrev, sizeNow});
        wordLinks.push_back(link); // Initialize with empty link
        LOG(("Pushed back: " + link).c_str());
        LOG(("Created " + std::to_string(satellites.size()) + " satellites").c_str());
    }

    std::vector<int> getWordStartIndices()
    {
        std::vector<int> startIndices;
        for (const auto &wordPair : words)
        {
            startIndices.push_back(wordPair.first);
        }
        return startIndices;
    }

    std::string getWordLinkByIndex(int index)
    {
        if (index >= 0 && index < words.size())
        {
            return wordLinks[index];
        }
        return ""; // Return empty string if index is out of bounds
    }

    void updateSatellites(double deltaTime)
    {
        for (auto &satellite : satellites)
        {
            satellite.update(deltaTime);
        }
    }

    void mouseDragSatellites(double rotationX, double rotationY)
    {
        for (auto &satellite : satellites)
        {
            satellite.mouseDrag(rotationX, rotationY);
        }
    }

    std::vector<double> getSatellitePositions()
    {
        std::vector<double> positions;
        for (const auto &satellite : satellites)
        {
            positions.push_back(satellite.x);
            positions.push_back(satellite.y);
            positions.push_back(satellite.z);
        }
        return positions;
    }

    std::vector<char> getSatelliteLetters()
    {
        std::vector<char> letters;
        for (const auto &satellite : satellites)
        {
            letters.push_back(satellite.letter);
        }
        return letters;
    }

    std::vector<double> getSatelliteRotations()
    {
        std::vector<double> rotations;
        for (const auto &satellite : satellites)
        {
            rotations.push_back(satellite.rotation);
        }
        return rotations;
    }

    void setSatelliteRotation(int index, double rotation)
    {
        if (index >= 0 && index < satellites.size())
        {
            satellites[index].rotation = rotation;
        }
    }
};

// Wrapper functions for emscripten
EMSCRIPTEN_KEEPALIVE
extern "C"
{
    GlobeController *createGlobeController()
    {
        LOG("Creating GlobeController");
        return new GlobeController();
    }

    void destroyGlobeController(GlobeController *controller)
    {
        LOG("Destroying GlobeController");
        delete controller;
    }

    void createSatellitesFromString(GlobeController *controller, const char *text, double startPhi, double startTheta, const char *link, double speed)
    {
        LOG(("Creating satellites from string: " + std::string(text)).c_str());
        LOG(("Recieved link: " + std::string(link)).c_str());
        controller->createSatellitesFromString(std::string(text), startPhi, startTheta, std::string(link), speed);
    }

    void updateSatellites(GlobeController *controller, double deltaTime)
    {
        controller->updateSatellites(deltaTime);
    }

    void mouseDragSatellites(GlobeController *controller, double rotationX, double rotationY)
    {
        controller->mouseDragSatellites(rotationX, rotationY);
    }

    void getSatellitePositions(GlobeController *controller, double *positions)
    {
        auto pos = controller->getSatellitePositions();
        for (size_t i = 0; i < pos.size(); ++i)
        {
            positions[i] = pos[i];
        }
    }

    void getSatelliteLetters(GlobeController *controller, char *letters)
    {
        auto let = controller->getSatelliteLetters();
        for (size_t i = 0; i < let.size(); ++i)
        {
            letters[i] = let[i];
        }
    }

    void getSatelliteRotations(GlobeController *controller, double *rotations)
    {
        auto rots = controller->getSatelliteRotations();
        for (size_t i = 0; i < rots.size(); ++i)
        {
            rotations[i] = rots[i];
        }
    }

    void setSatelliteRotation(GlobeController *controller, int index, double rotation)
    {
        controller->setSatelliteRotation(index, rotation);
    }

    int getSatelliteCount(GlobeController *controller)
    {
        return controller->getSatelliteRotations().size();
    }

    int *getWordStartIndices(GlobeController *controller, int *size)
    {
        std::vector<int> indices = controller->getWordStartIndices();
        *size = indices.size();
        int *result = (int *)malloc(indices.size() * sizeof(int));
        std::copy(indices.begin(), indices.end(), result);
        return result;
    }

    const char *getWordLinkByIndex(GlobeController *controller, int index)
    {
        static std::string result;
        result = controller->getWordLinkByIndex(index);
        return result.c_str();
    }
}