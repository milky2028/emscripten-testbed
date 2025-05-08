#include <memory>
#include <emscripten/bind.h>

void create_memory() {
  for (int i = 0; i < 10000; ++i) {
    std::shared_ptr<char> p{new char[10000000]};
  }
}

void create_memory_leak() {
  new char[10000000];
}

EMSCRIPTEN_BINDINGS(module) {
  emscripten::function("create_memory", &create_memory);
  emscripten::function("create_memory_leak", &create_memory_leak);
  emscripten::function("do_leak_check_fatal", &__lsan_do_leak_check);
  emscripten::function("do_leak_check_recoverable", &__lsan_do_recoverable_leak_check);
}
