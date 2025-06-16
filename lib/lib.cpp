#include <thread>
#include <cstdio>
#include <vector>
#include <emscripten/bind.h>

const int ONE_GIBIBYTE = 1024 * 1024 * 1024;
static std::vector<char*> leaks;

void create_memory_leak() {
  printf("created memory leak\n");
  char* leak = new char[0.1 * ONE_GIBIBYTE];
  leaks.push_back(leak);
}

void create_threaded_memory_leak() {
  printf("created threaded memory leak\n");
  for (int i = 0; i <= 10; ++i) {
    std::thread([] {
      create_memory_leak();
    }).detach();
  }
}

EMSCRIPTEN_BINDINGS(module) {
  emscripten::function("create_memory_leak", &create_memory_leak);
  emscripten::function("create_threaded_memory_leak", &create_threaded_memory_leak);
}
