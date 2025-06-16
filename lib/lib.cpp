#include <thread>
#include <emscripten/bind.h>

const int ONE_GIBIBYTE = 1024 * 1024 * 1024;

void create_memory_leak() {
  new char[0.25 * ONE_GIBIBYTE];
}

void create_threaded_memory_leak() {
  std::thread([] {
    create_memory_leak();
  });
}

EMSCRIPTEN_BINDINGS(module) {
  emscripten::function("create_memory_leak", &create_memory_leak);
  emscripten::function("create_threaded_memory_leak", &create_threaded_memory_leak);
}
