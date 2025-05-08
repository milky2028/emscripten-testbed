#include <memory>
#include <emscripten/bind.h>

void create_memory() {
  for (int i = 0; i < 10000; ++i) {
    std::shared_ptr<char> p{new char[100000]};
  }
}

EMSCRIPTEN_BINDINGS(module) {
  emscripten::function("create_memory", &create_memory);
}
