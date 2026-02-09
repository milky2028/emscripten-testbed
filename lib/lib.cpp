#include <thread>
#include <cstdio>
#include <vector>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <emscripten/threading.h>
#include <future>
#include <map>

struct Stuff {
  std::string s1;
  int s2;
  int s3;
};

void takes_val(emscripten::val some_string) {
  printf("val string: %s\n", some_string.as<std::string>().c_str());
}

void takes_val_ref(const emscripten::val& some_string) {
  printf("val string: %s\n", some_string.as<std::string>().c_str());
}

void takes_val_move(const emscripten::val&& some_string) {
  printf("val string: %s\n", some_string.as<std::string>().c_str());
}

void takes_class_const_ref(const Stuff& stuff) {
  printf("log stuff: %s\n", stuff.s1.c_str());
}

void fn_takes_string(std::string message) {
  printf("log string: %s\n", message.c_str());
}

void fn_takes_const_string_ref(const std::string& message) {
  printf("log string: %s\n", message.c_str());
}

std::string get_stored_string(const emscripten::val& storage, const std::string& key) {
  auto result = storage.call<emscripten::val>("getItem", key);
  if (result == emscripten::val::null()) {
    return {};
  }

  return result.as<std::string>();
}

struct SharedContext {
  std::string key;
  std::promise<std::string> promise;
};

std::string get_item_from_session_storage(const std::string& key) {
  auto session_storage = emscripten::val::global("sessionStorage");
  if (session_storage != emscripten::val::undefined()) {
    return get_stored_string(session_storage, key);
  }

  std::promise<std::string> promise;
  std::future<std::string> future = promise.get_future();

  auto ctx = std::make_unique<SharedContext>(std::move(key), std::move(promise));
  emscripten_async_run_in_main_runtime_thread(EM_FUNC_SIG_VI, static_cast<void(*)(std::unique_ptr<SharedContext>)>([] (auto raw_ctx) {
    auto session_storage = emscripten::val::global("sessionStorage");
    raw_ctx->promise.set_value(get_stored_string(session_storage, raw_ctx->key));
  }), ctx.release());

  return future.get();
}

void get_from_main_thread() {
  auto val = get_item_from_session_storage("name");
  printf("from main thread: %s\n", val.c_str());
}

void get_from_thread() {
  std::thread([] {
    auto val = get_item_from_session_storage("name");
    printf("from other thread: %s\n", val.c_str());
  }).detach();
}

std::map<std::string, std::string> some_map = {{"one", "1"}, {"two", "2"}};

template <typename Key, typename Value>
auto cpp_map_to_js_map(std::map<Key, Value> cpp_map) {
  auto js_map = emscripten::val::global("Map").new_();
  for (const auto& [key, value] : cpp_map) {
    js_map.call<emscripten::val>("set", key, value);
  }

  return js_map;
}

auto convert_map() {
  return cpp_map_to_js_map(some_map);
}

template <class T> class point;
namespace detail {
    template <typename T> bool point_equality(const point<T>& a, const point<T>& b);
} // namespace detail

template <class T>
class point {
public:
    using value_type = T;

    T x;
    T y;

    static constexpr auto zero() { return point(0, 0); }

    constexpr point() noexcept = default;
    constexpr point(T _x, T _y) noexcept : x(std::move(_x)), y(std::move(_y)) {}

    friend bool operator==(const point& a, const point& b) {
        return detail::point_equality(a, b);
    }

    friend bool operator!=(const point& a, const point& b) { return !(a == b); }

    friend point operator-(const point& a, const point& b) {
        return point(a.x - b.x, a.y - b.y);
    }

    point& operator-=(const point& a) {
        x -= a.x;
        y -= a.y;
        return *this;
    }
};

namespace detail {
  template <typename T>
  bool point_equality(const point<T>& a, const point<T>& b) {
      return (a.x == b.x) && (a.y == b.y);
  }
}

using curve_map_array_element = std::array<std::uint8_t, 256>;
using curve_map_array = std::array<curve_map_array_element, curve_count_k>;

curve_map_array arr = {{{20, 256}, 5}, {{20, 256}, 5}, {{20, 256}, 5}};

EMSCRIPTEN_BINDINGS(module) {
  emscripten::value_object<Stuff>("Stuff")
    .field("s1", &Stuff::s1)
    .field("s2", &Stuff::s2)
    .field("s3", &Stuff::s3);

  emscripten::value_object<point<double>>("PointDouble")
  .field("x", &point<double>::x)
  .field("y", &point<double>::y);

  emscripten::function("get_from_main_thread", &get_from_main_thread);
  emscripten::function("get_from_thread", &get_from_thread);
  emscripten::function("fn_takes_string", &fn_takes_string);
  emscripten::function("fn_takes_const_string_ref", &fn_takes_const_string_ref);
  emscripten::function("takes_class_const_ref", &takes_class_const_ref);
  emscripten::function("takes_val", &takes_val);
  emscripten::function("takes_val_ref", &takes_val_ref);
  emscripten::function("takes_val_move", &takes_val_move);
  emscripten::function("convert_map", &convert_map);
}
