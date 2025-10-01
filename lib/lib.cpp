#include <thread>
#include <cstdio>
#include <vector>
#include <emscripten.h>
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

bool is_web_gpu_capable() {
    bool gpu = emscripten::val::global("navigator")["gpu"].as<bool>();
    emscripten::val buffer_global = emscripten::val::global("GPUBufferUsage");
    if (!buffer_global.as<bool>()) return false;

    bool buffer_usage_src = buffer_global["COPY_SRC"].as<bool>();
    return gpu && buffer_usage_src;
}

auto write_js_buffer_to_wasm_memory(emscripten::val buffer) {
  auto size = buffer["byteLength"].as<size_t>();
  auto *ptr = reinterpret_cast<uint8_t*>(malloc(size));
  auto view = emscripten::val(emscripten::typed_memory_view(size, ptr));
  view.call<void>("set", buffer);

  return reinterpret_cast<intptr_t>(ptr);
}

std::string access_session_storage(const std::string& key) {
  auto session_storage = emscripten::val::global("sessionStorage");
  auto item = session_storage.call<emscripten::val>("getItem", key);
  if (item == emscripten::val::null()) {
    return {};
  }

  return item.as<std::string>();
}

auto get_buffer_view(size_t size, uintptr_t ptr) {
  return emscripten::val(emscripten::typed_memory_view(size, reinterpret_cast<uint8_t*>(ptr)));
}

void modify_buffer(std::string original_buffer) {
  MAIN_THREAD_EM_ASM({
    const view = Module.get_buffer_view($0, $1);
    console.log(new TextDecoder().decode(view.slice()));
  }, original_buffer.size(), original_buffer.c_str());
}

void put_data_in_buffer() {
  std::string buffer = "Here's my string data in C++ that I'm trying to overwrite.";
  modify_buffer(buffer);
}

EMSCRIPTEN_BINDINGS(module) {
  emscripten::function("create_memory_leak", &create_memory_leak);
  emscripten::function("create_threaded_memory_leak", &create_threaded_memory_leak);
  emscripten::function("is_web_gpu_capable", &is_web_gpu_capable);
  emscripten::function("write_js_buffer_to_wasm_memory", &write_js_buffer_to_wasm_memory, emscripten::allow_raw_pointers());
  emscripten::function("access_session_storage", &access_session_storage);
  emscripten::function("put_data_in_buffer", &put_data_in_buffer);
  emscripten::function("get_buffer_view", &get_buffer_view);
}
