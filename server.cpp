#define ASIO_ENABLE_OLD_SERVICES
#define _WIN32_WINNT 0x0A00
#include "crow.h"
#include <mutex>
#include <vector>
#include <string>
#include <algorithm>

struct Room {
    int id;
    std::string name;
    int capacity = 10;
    std::vector<std::string> members;
};

// State Data Global
std::string system_status = "waiting"; // waiting, open, locked
std::vector<Room> rooms;
std::mutex data_mutex;

const std::string ADMIN_PASS = "756567";
const std::string ADMIN_SESSION_TOKEN = "valid_token_756567";

void init_rooms() {
    rooms.clear();
    for (int i = 1; i <= 10; ++i) {
        Room r;
        r.id = i;
        r.name = "Bilik " + std::to_string(i);
        r.capacity = 10;
        rooms.push_back(r);
    }
}

int main() {
    init_rooms();
    crow::SimpleApp app;

    // Fail Statik: HTML, CSS, JS
    CROW_ROUTE(app, "/")([](const crow::request&, crow::response& res) {
        res.set_static_file_info("public/index.html");
        res.end();
    });

    CROW_ROUTE(app, "/admin.html")([](const crow::request&, crow::response& res) {
        res.set_static_file_info("public/admin.html");
        res.end();
    });

    CROW_ROUTE(app, "/<string>")([](const crow::request&, crow::response& res, std::string filename) {
        res.set_static_file_info("public/" + filename);
        res.end();
    });

    // API: Dapatkan status bilik (Dipanggil peserta setiap saat)
    CROW_ROUTE(app, "/api/state").methods("GET"_method)([]() {
        std::lock_guard<std::mutex> lock(data_mutex);
        crow::json::wvalue res;
        res["status"] = system_status;
        for (size_t i = 0; i < rooms.size(); ++i) {
            res["rooms"][i]["id"] = rooms[i].id;
            res["rooms"][i]["name"] = rooms[i].name;
            res["rooms"][i]["capacity"] = rooms[i].capacity;
            res["rooms"][i]["members"] = rooms[i].members;
        }
        return res;
    });

    // API: Sertai Bilik (Dengan Mutex Locking untuk keselamatan 100 pengguna)
    CROW_ROUTE(app, "/api/join").methods("POST"_method)([](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body) return crow::response(400);

        int room_id = body["room_id"].i();
        std::string user = body["user"].s();

        std::lock_guard<std::mutex> lock(data_mutex);

        if (system_status != "open") {
            crow::json::wvalue res;
            res["success"] = false;
            res["message"] = "Pemilihan belum dibuka atau telah dikunci!";
            return crow::response(res);
        }

        // Buang nama jika sudah berada di bilik lain
        for (auto& r : rooms) {
            auto it = std::find(r.members.begin(), r.members.end(), user);
            if (it != r.members.end()) {
                r.members.erase(it);
            }
        }

        // Masuk bilik baharu jika ada ruang
        for (auto& r : rooms) {
            if (r.id == room_id) {
                if (r.members.size() >= static_cast<size_t>(r.capacity)) {
                    crow::json::wvalue res;
                    res["success"] = false;
                    res["message"] = "Bilik telah penuh!";
                    return crow::response(res);
                }
                r.members.push_back(user);
                break;
            }
        }

        crow::json::wvalue res;
        res["success"] = true;
        return crow::response(res);
    });

    // API: Keluar Bilik
    CROW_ROUTE(app, "/api/leave").methods("POST"_method)([](const crow::request& req) {
        auto body = crow::json::load(req.body);
        if (!body) return crow::response(400);

        std::string user = body["user"].s();
        std::lock_guard<std::mutex> lock(data_mutex);

        for (auto& r : rooms) {
            auto it = std::find(r.members.begin(), r.members.end(), user);
            if (it != r.members.end()) {
                r.members.erase(it);
            }
        }

        crow::json::wvalue res;
        res["success"] = true;
        return crow::response(res);
    });

    // API: Pengesahan Kata Laluan Admin (756567)
    CROW_ROUTE(app, "/api/admin/login").methods("POST"_method)([](const crow::request& req) {
        auto body = crow::json::load(req.body);
        crow::json::wvalue res;
        if (body && body["password"].s() == ADMIN_PASS) {
            res["success"] = true;
            res["token"] = ADMIN_SESSION_TOKEN;
        } else {
            res["success"] = false;
        }
        return crow::response(res);
    });

    // API: Ubah Status (Admin)
    CROW_ROUTE(app, "/api/admin/status").methods("POST"_method)([](const crow::request& req) {
        if (req.get_header_value("Authorization") != ADMIN_SESSION_TOKEN)
            return crow::response(401);

        auto body = crow::json::load(req.body);
        std::lock_guard<std::mutex> lock(data_mutex);
        system_status = body["status"].s();

        crow::json::wvalue res;
        res["success"] = true;
        return crow::response(res);
    });

    // API: Kosongkan Bilik (Admin)
    CROW_ROUTE(app, "/api/admin/reset").methods("POST"_method)([](const crow::request& req) {
        if (req.get_header_value("Authorization") != ADMIN_SESSION_TOKEN)
            return crow::response(401);

        std::lock_guard<std::mutex> lock(data_mutex);
        init_rooms();

        crow::json::wvalue res;
        res["success"] = true;
        return crow::response(res);
    });

    // Jalankan server pada port 8080 dengan multi-threading (100 users)
    app.port(8080).concurrency(8).run();
}