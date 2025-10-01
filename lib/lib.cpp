#include <thread>
#include <cstdio>
#include <vector>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <emscripten/threading.h>

std::string get_value(emscripten::val storage, const std::string& key) {
  auto result = storage.call<emscripten::val>("getItem", key);
  if (result == emscripten::val::null()) {
    return {};
  }

  return result.as<std::string>();
}

struct SharedContext {
  std::string key;
  std::function<void(std::string)> callback;
};

void get_item_from_session_storage(const std::string& key, std::function<void(std::string)> callback) {
  auto session_storage = emscripten::val::global("sessionStorage");
  if (session_storage != emscripten::val::undefined()) {
    callback(get_value(session_storage, key));
    return;
  }

  SharedContext* ctx = new SharedContext{std::move(key), std::move(callback)};
  emscripten_async_run_in_main_runtime_thread(EM_FUNC_SIG_VI, static_cast<void(*)(SharedContext*)>([] (auto raw_ctx) {
    auto session_storage = emscripten::val::global("sessionStorage");
    raw_ctx->callback(get_value(session_storage, raw_ctx->key));

    delete raw_ctx;
  }), ctx);
}

void get_from_main_thread() {
  get_item_from_session_storage("name", [] (auto value) {
    printf("from main thread: %s\n", value.c_str());
  });
}

void get_from_thread() {
  std::thread([] {
    get_item_from_session_storage("name", [] (auto value) {
      printf("from other thread: %s\n", value.c_str());
    });
  }).detach();
}

EMSCRIPTEN_BINDINGS(module) {
  emscripten::function("get_from_main_thread", &get_from_main_thread);
  emscripten::function("get_from_thread", &get_from_thread);
}
