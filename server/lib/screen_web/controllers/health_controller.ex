defmodule ScreenWeb.HealthController do
  use ScreenWeb, :controller

  def check(conn, _params) do
    json(conn, %{status: "ok"})
  end
end
