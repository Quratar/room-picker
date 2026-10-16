cmake_minimum_required(VERSION 3.15)
project(RoomPickerServer)

set(CMAKE_CXX_STANDARD 17)
add_definitions(-D_WIN32_WINNT=0x0A00)

include(FetchContent)
FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG master
)
FetchContent_MakeAvailable(Crow)

add_executable(server server.cpp)
target_link_libraries(server PRIVATE Crow::Crow ws2_32 mswsock)